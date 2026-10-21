# ADR-0009: Interoperabilidad HL7 FHIR R4 con outbox transaccional

- **Estado:** aceptado (20-oct-2026)
- **Objetivo y requisitos:** OE-3, RNF-09, IND-10 (casos TC-01 a TC-10)
- **Migración:** `20261020235238_interoperabilidad_fhir.sql`
- **Código:** `supabase/functions/_shared/fhir/` (núcleo), `supabase/functions/fhir-sync/` (Edge Function), `fhir/pruebas/` (IND-10)

## Contexto

El diseño del módulo de interoperabilidad (sección 4.4 del documento de grado) fija que CitasYA es la fuente de verdad de sus citas y que un servidor HL7 FHIR R4 representa el sistema de una EPS o IPS. Cada cita reservada, cancelada o reprogramada debe llegar a ese servidor sin perderse ni duplicarse, aunque el servidor esté caído, y sin que ningún dato personal salga de la plataforma (Ley 1581 de 2012).

## Decisión

1. **Outbox transaccional.** Un disparador `AFTER INSERT OR UPDATE` sobre `appointments` escribe un evento en `private.fhir_outbox` dentro de la misma transacción que reserva, cancela o reprograma la cita. Solo cuentan los cambios que viajan a FHIR: estado, franja, modalidad y paciente. Si se reprograma, el evento guarda la franja que se libera.
2. **Un solo núcleo, probado.** El mapeador (funciones puras), el cliente REST y el sincronizador viven en `_shared/fhir`. Son TypeScript sin dependencias de Deno ni de Node, así que el mismo código corre en la Edge Function `fhir-sync`, en las pruebas unitarias y en los casos TC-01 a TC-10.
3. **Entrega.** Cuando la transacción se confirma, pg_net despierta a `fhir-sync`; la petición queda en la cola de pg_net dentro de la misma transacción, así que una reserva revertida no despierta nada. Como respaldo, pg_cron la llama cada minuto mientras queden eventos por publicar. La función toma los eventos con `FOR UPDATE SKIP LOCKED` y un bloqueo de 2 minutos, los agrupa por cita y publica **el estado actual** de cada una. Así el orden de los eventos no importa y repetir una publicación no crea nada nuevo: los recursos usan PUT con id, el paciente usa actualización condicional y HAPI no crea una versión si el contenido no cambió.
4. **Concurrencia.** Las franjas se publican con `If-Match` sobre la versión guardada en `private.fhir_vinculos`, una por servidor. Si el servidor responde con un conflicto de versión, se leen la franja y sus citas:
   - Si otra cita, u otro canal, tomó la franja de una cita activa, es un conflicto real. Queda registrado y no se sobrescribe.
   - Si solo cambió la versión, se reintenta una vez con la versión actual.
   - Las franjas que se liberan y que ahora usa otra cita no se tocan.
5. **Reintentos.**
   - Sin respuesta, 401, 403, 408, 429 o 5xx: el evento sigue pendiente, con espera exponencial de 30 s a 1 h. A los 20 intentos queda fallido.
   - Cualquier otro 4xx: fallido, con el diagnóstico del servidor.
6. **Privacidad desde el diseño.**
   - El paciente se identifica con un HMAC-SHA-256 calculado dentro de la base, con una clave que Vault genera y que nunca sale de ella. El recurso Patient lleva la etiqueta `PSEUDED`.
   - No viajan nombre, documento, teléfono, correo, fecha de nacimiento, notas ni el motivo escrito de una cancelación. La cancelación usa el código estándar `pat-cpp`.
   - Del médico tampoco viajan teléfono ni correo. Los médicos son sintéticos (SIM-); las EPS, IPS y sedes son datos institucionales públicos.
7. **Alcance de las franjas.** La agenda simulada tiene 72.180 franjas futuras, demasiadas para publicarlas en un servidor público compartido. La carga inicial publica los recursos maestros: 11 EPS, 10 IPS, 32 sedes y, por cada uno de los 135 médicos activos, su Practitioner, PractitionerRole y Schedule. Las franjas se publican cuando intervienen en una cita. Cada Bundle de cita incluye los maestros de su médico, así que es autosuficiente aunque el servidor haya perdido datos.
8. **Seguridad de la función.**
   - `fhir-sync` exige un JWT válido en la puerta de enlace y, además, una de dos cosas: la clave de la tarea programada, que Vault genera y que la función compara contra la base, o la sesión de un administrador.
   - Las funciones de la outbox solo las ejecuta `service_role`.
   - Las tablas viven en el esquema `private`, con RLS y sin privilegios para `anon` ni `authenticated`.
9. **Servidores.**
   - **Demostración:** el HAPI público de pruebas (`https://hapi.fhir.org/baseR4`).
   - **Respaldo y CI:** HAPI en Docker, con la versión fijada `hapiproject/hapi:v8.12.0-2`.
   - **Cambio de servidor:** basta con cambiar `FHIR_BASE_URL`, ejecutar la carga inicial y `select private.fhir_encolar_citas_futuras()`.

## Hallazgo durante la implementación

Ante un `If-Match` desactualizado, HAPI responde **409 Conflict** (HAPI-0989), no el 412 Precondition Failed que menciona la especificación y que asumía el diseño. Medido en el servidor público el 20-oct-2026. El sincronizador y TC-07 aceptan cualquiera de los dos como conflicto de versión.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Publicar desde el navegador | Expondría credenciales y no habría garantía: si la persona cierra la página, el evento se pierde. |
| Llamar al servidor FHIR dentro de `reservar_cita` | La reserva dependería de la disponibilidad y la latencia de un tercero. Si la llamada sale y la transacción se revierte, el servidor queda con una cita que no existe. |
| Webhooks de base de datos sin outbox | Son «dispara y olvida»: si el servidor está caído, el cambio se pierde y no hay reintentos ni registro. |
| Publicar las 72.180 franjas | Volumen excesivo para un servidor público compartido, y la agenda cambia cada día. En el ambiente propio en Docker sí es posible. |
| Enviar los datos reales del paciente | Contradice la Ley 1581 y el diseño aprobado («ningún dato personal real sale de la plataforma»). |

## Consecuencias

- **Pruebas.**
  - 37 pruebas unitarias del núcleo, más 4 del panel de administración (incluye axe).
  - 38 reglas SQL: se suman T32 a T38, sobre la outbox, los permisos y la seudonimización.
  - TC-01 a TC-10: 10/10 contra el HAPI público. Dos corridas tempranas fallaron por la red de ese servidor (`fetch failed`) y no por la lógica; por eso la medición oficial de IND-10 se hace en CI contra HAPI en Docker, como prevé la tabla de riesgos.
- **Producción (20-oct-2026).**
  - Carga inicial: 458 recursos en 5 Bundles.
  - La cita futura que ya existía se publicó sola por pg_cron: Appointment `booked`, Slot `busy` y Patient seudonimizado.
  - La función rechaza llamadas sin token, con solo la clave pública o con una clave falsa (401).
- **Operación.** El panel `/admin/fhir` muestra los recursos publicados, el estado de la outbox y los últimos 30 eventos con enlace al recurso en el servidor. Permite sincronizar y repetir la carga inicial.
- **Pendiente.**
  - Representar al titular como `RelatedPerson` de los familiares (RF-13).
  - Publicar la agenda completa en el ambiente Docker.
  - Actualizar el documento de grado: 409 frente a 412, y el alcance de las franjas.

## Cómo explicarlo en la sustentación

«Cuando alguien reserva una cita en CitasYA, la misma transacción que guarda la cita deja un evento en una tabla outbox. Si la transacción falla, el evento no existe; si se confirma, el evento espera aunque el servidor de la EPS esté caído. Una función lo publica en el servidor FHIR como un Bundle de transacción: el paciente con un seudónimo, la franja con control de versión y la cita, todo o nada. Si otro canal ya tomó esa franja, el servidor rechaza la versión y CitasYA lo registra como conflicto en vez de sobrescribirlo. Por eso no hay pérdidas, ni duplicados, ni dobles reservas. Lo demuestran diez casos de prueba automáticos que corren en cada pull request contra un HAPI FHIR en Docker. Y ningún dato personal sale de la plataforma: el servidor solo ve un código que no permite saber quién es la persona.»
