# ADR-0005 — Entorno de simulación con datos reales y agendamiento robusto

- **Estado:** Propuesta (pendiente de aprobación del autor antes de aplicar en producción)
- **Fecha:** 2026-09-26
- **Trazabilidad:** R-02 (datos reales de EPS), R-03 (agendamiento robusto), H-15, H-17, H-20–H-27, H-30, H-31 · OE-2, OE-3 · Ley 1581/2012

## Contexto

El autor pidió que la plataforma **simule la realidad con datos reales** para aumentar la rigurosidad, centrada en las EPS de Bogotá. Los datos del MVP eran inventados para pruebas. La auditoría de la base de datos (26-sep-2026) confirmó el problema:

- **H-30:** 0 de 10.760 horarios son futuros (generados en abril–mayo de 2026). **Hoy no es posible agendar** en la página publicada.
- **H-31:** catálogo de EPS incorrecto: incluye Medimás y Coomeva EPS (liquidadas), asigna a "Medimás" el NIT 900914254 (que según MinSalud es de Salud Mía) y omite Aliansalud, Capital Salud y Mallamas.
- H-20–H-27: la auditoría de seguridad exige rehacer las funciones de reserva y las políticas RLS.

## Principio rector: todo lo institucional es real; ninguna persona es real

| Dato | Origen | Fuente citable |
|---|---|---|
| **EPS** (nombre, código de habilitación, NIT, régimen) | **Real** | MinSalud, *EPS vigentes del régimen contributivo y subsidiado – SGSSS* (05-jun-2025), filtrado por las 9 EPS habilitadas en Bogotá según el **Decreto 0182 de 2026**: Aliansalud, Salud Total, Sanitas, Compensar, Sura, Famisanar, Capital Salud, Nueva EPS y Mallamas |
| **IPS y sedes** (nombre, código de habilitación de sede, dirección, naturaleza jurídica) | **Real** | MinSalud, *Registro Especial de Prestadores y Sedes de Servicios de Salud* (REPS), datos.gov.co `c36g-9fc2`, corte 12-mar-2026. **Solo instituciones con NIT**: se excluyen los profesionales independientes (personas naturales) |
| **Red EPS → IPS** | **Real** cuando es verificable (red propia o pública): Capital Salud → Subredes Integradas E.S.E.; Sanitas → Colsanitas; Compensar → IPS Compensar; Sura → IPS Suramericana. **Asignada para la simulación** en los demás casos, y marcada como tal en los datos | Registros públicos de cada entidad; se documenta caso por caso |
| **Especialidades** | **Real** | Resolución 256 de 2016 y Circular Externa 038 de 2025 |
| **Tiempos de espera objetivo** | **Real (parámetro)** | Circular Externa 038 de 2025 (MGTE, Fase I): medicina general ≤ 3 días; pediatría ≤ 5; obstetricia ≤ 8; ginecología, psiquiatría y cirugía general ≤ 10; medicina interna ≤ 15 |
| **Médicos** | **Sintéticos** | Nombres generados; registro con prefijo `SIM-` |
| **Pacientes** | **Sintéticos** | Cuentas de prueba (`@citasya.test`, cédulas en rango reservado) |
| **Agenda y ocupación** | **Sintéticas, calibradas con datos reales** | Generador determinista cuya primera cita disponible por especialidad se ubica alrededor del estándar MGTE |

**Por qué las personas no pueden ser reales:** publicar el nombre de un médico real con una agenda inventada le atribuye públicamente una disponibilidad falsa a una persona identificable. Eso es tratamiento de datos personales sin autorización (Ley 1581/2012) y es cuestionable desde la ética de investigación. Los pacientes reales solo participan en las pruebas de usabilidad del Sprint 2, bajo consentimiento informado, y sus datos no se cargan a la simulación. La rigurosidad no viene de exponer personas, sino de que **cada dato institucional sea real y citable**, y de que lo sintético esté declarado y justificado.

Cada registro lleva una columna de **procedencia** (`fuente`, `fecha_corte`), para que la interfaz y la tesis puedan distinguir qué es real y qué es simulado.

## "Datos que no se actualicen": determinismo + ventana móvil

Un conjunto totalmente estático caduca (eso causó H-30). Se separa lo **estable** de lo **temporal**:

- **Estable:** EPS, IPS/sedes, red, especialidades, médicos, patrones de horario y semilla de ocupación. Se cargan una vez desde las fuentes oficiales, con fecha de corte; no cambian durante el proyecto.
- **Temporal:** la agenda se materializa para los próximos **60 días** con un generador **determinista** (misma semilla → mismo patrón relativo a la fecha). Un job diario (`pg_cron`) agrega el día que entra en la ventana y retira los horarios vencidos sin reservar. **Las citas reservadas nunca se borran.**

La simulación es reproducible (mismas condiciones para cada prueba y cada participante del Sprint 2) y nunca caduca.

## Agendamiento robusto (R-03)

La reserva pasa a una **función transaccional en la base de datos** (`reservar_cita`), en lugar de varias llamadas desde el navegador:

1. **Atomicidad y concurrencia:** `UPDATE availability_slots SET is_booked = true WHERE id = $1 AND NOT is_booked AND date >= hoy RETURNING …`; solo una transacción gana un horario. Un **índice único parcial** sobre `appointments(slot_id)` para citas activas garantiza la integridad aunque exista otro camino de escritura.
2. **Reglas de negocio en el servidor:** el paciente reserva solo en la red de **su EPS**; máximo una cita activa por especialidad; sin horarios pasados; cancelación y reprogramación con al menos 24 h de anticipación.
3. **Validación de entradas:** modalidad válida (complementa H-17), longitud máxima de notas, identificadores UUID.
4. **Seguridad (H-20–H-24):** `SECURITY DEFINER` con `search_path` fijo; `EXECUTE` revocado a `anon` en funciones internas y de trigger; `reservar_cita` solo para `authenticated`; se elimina el oráculo `check_cedula_exists` y la unicidad de la cédula se verifica dentro del registro.
5. **Errores tipados:** códigos estables (`HORARIO_NO_DISPONIBLE`, `EPS_NO_CORRESPONDE`, `CITA_DUPLICADA`, …) que la interfaz traduce a mensajes claros para adultos mayores.

## Verificación

- **Concurrencia:** 50 clientes intentan reservar el mismo horario en paralelo → exactamente 1 éxito, 49 `HORARIO_NO_DISPONIBLE`, 0 duplicados.
- **Reglas:** EPS distinta, horario pasado, cita duplicada por especialidad, cancelación con menos de 24 h.
- **Seguridad:** re-ejecución del linter de Supabase (antes/después de H-20–H-27).
- **Realismo:** días hasta la primera cita disponible por especialidad y EPS frente al estándar MGTE.
- **Trazabilidad de datos:** cada EPS/IPS de la simulación se puede verificar contra la fuente oficial por su código.

## Entornos

Las pruebas destructivas y de carga **no se ejecutan contra producción**, sino en un entorno aislado (Supabase local en Docker o rama de Supabase). La migración a producción (datos + funciones) se aplica una vez, después de verificarla, **con aprobación explícita del autor**. Los datos inventados del MVP se reemplazan; las cuentas de prueba del autor se conservan.

## Alternativas descartadas

- **Mocks en el frontend:** no ejercitan la base de datos ni la concurrencia; la simulación no sería verificable de extremo a extremo.
- **Datos estáticos con fechas fijas:** caducan (H-30).
- **Médicos o pacientes reales:** contrario a la Ley 1581/2012 sin autorización, y éticamente cuestionable.

## Cómo explicarlo en la sustentación

> "Todo lo institucional es real y lo pueden verificar: las nueve EPS habilitadas en Bogotá con su código y NIT de MinSalud, las sedes de las IPS con su código de habilitación del REPS, y los tiempos máximos de espera de la Circular 038. Lo único sintético son las personas, y es una decisión deliberada: poner el nombre de un médico real con una agenda inventada sería tratar sus datos sin autorización. La agenda se genera de forma determinista en una ventana de 60 días, así que la simulación es reproducible y nunca caduca. Y la reserva es una transacción en la base de datos: 50 personas intentan tomar el mismo horario al mismo tiempo, solo una lo logra y nunca hay duplicados."
