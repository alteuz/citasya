# ADR-0008: Modelo familiar (cuenta de cuidador)

- **Estado:** aceptado (19-oct-2026)
- **Requisito:** RF-13. Un titular registra a sus familiares a cargo y pide citas para ellos.
- **Migración:** `20261015220340_modelo_familiar.sql`

## Contexto

Las personas mayores, que son la población objetivo de CitasYA, a menudo no piden sus citas solas: lo hace un hijo, un nieto o el cónyuge desde su propio celular. También pasa al revés, cuando una madre o un padre pide las citas de sus hijos menores. Además, cada persona puede estar afiliada a una EPS distinta.

Antes de este cambio, una cuenta solo podía pedir citas para sí misma. El cuidador tenía que conocer la contraseña de la persona a su cargo o crearle una cuenta que esa persona nunca usaría.

## Decisión

1. **Familiares sin cuenta propia.** La tabla `familiares` guarda los datos mínimos de cada familiar: nombre, documento, fecha de nacimiento, parentesco y **EPS propia**. Cada familiar pertenece a un único titular. Por RLS, solo el titular (y el administrador) puede verlo.
2. **La cita sigue siendo del titular.** `appointments.patient_id` es el titular, y `appointments.familiar_id` indica para quién es la cita (vacío si es para el titular). Por eso no cambian las políticas de lectura ni las funciones `cancelar_cita` y `reprogramar_cita`: el titular gestiona todas las citas de su familia, y las notificaciones le llegan a él.
3. **Reglas en la base de datos.** `reservar_cita(…, p_familiar_id)` comprueba que el familiar sea del titular, cruza la EPS del médico con la EPS del familiar y aplica la regla de una cita activa por especialidad a cada persona por separado. Registrar, editar y retirar familiares se hace con funciones transaccionales (`guardar_familiar`, `retirar_familiar`); no se permiten escrituras directas en la tabla.
4. **Retiro lógico.** Retirar a un familiar lo deja inactivo y conserva su historial de citas. No se permite retirarlo, ni cambiarle la EPS, mientras tenga citas próximas.
5. **Ley 1581 de 2012.** No se guardan datos de salud. Al registrar a un familiar, el titular declara ser su representante o tener su autorización, y ese momento queda registrado en `autorizacion_en`.
6. **Interfaz pensada para agilizar.**
   - «Mi familia» tiene un botón «Pedir cita» para cada persona.
   - El panel muestra el acceso «Pedir una cita para…».
   - El buscador pregunta «¿Para quién es la cita?» y elige sola la EPS de esa persona.
   - En la confirmación, solo se puede elegir a quienes pertenecen a la EPS del médico.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Cuentas vinculadas: cada familiar con su propio usuario | La persona mayor tendría que crear y recordar una contraseña, que es justo la barrera que se quiere quitar. Un menor de edad no puede tener cuenta propia. |
| Campo de texto libre «para quién» en la cita | No permite validar la EPS ni aplicar la regla de una cita por especialidad a cada persona, y obliga a repetir los datos en cada cita. |
| Varios perfiles en `profiles` sin usuario de Auth | `profiles` está ligada a `auth.users` por llave y disparador; mezclar ambos casos debilitaría las políticas RLS del perfil. |

## Consecuencias

- Las pruebas de reglas de la base de datos pasan de 17 a 31. Las nuevas (T18–T31) cubren la autorización, la fecha, el documento duplicado, la EPS del familiar, la regla por persona, el aislamiento entre cuentas, el retiro y el bloqueo de escrituras directas.
- El correo de confirmación indica para quién es la cita. En ese mismo cambio se corrigió H-38: la función `send-email` ahora exige que quien la invoca sea el dueño de la cita.
- **Interoperabilidad (Sprint 3):** el modelo encaja con HL7 FHIR. El familiar es un `Patient`, el titular puede representarse como `RelatedPerson` vinculado a ese paciente, y en `Appointment.participant` el actor es el `Patient` del familiar.

## Cómo explicarlo en la sustentación

«En Colombia es común que un hijo pida las citas de sus padres mayores o que los padres pidan las de sus hijos. CitasYA lo modela como una cuenta de cuidador: el titular registra a sus familiares, cada uno con su propia EPS. La base de datos garantiza tres cosas: que solo el titular los vea, que la cita sea con un médico de la EPS de ese familiar y que cada persona tenga como máximo una cita activa por especialidad. Lo verifican 14 pruebas automáticas. En FHIR, ese familiar es un Patient y el titular un RelatedPerson, así que el modelo ya está listo para el intercambio del Sprint 3.»
