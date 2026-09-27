-- ════════════════════════════════════════════════════════════════════════════
-- Agenda de la simulación en ventana móvil (ADR-0005, H-30)
--
-- - generar_agenda: crea los horarios de los próximos N días según los días de
--   atención y la duración de cita de cada médico sintético. Idempotente.
-- - simular_demanda: ocupa horarios "por otros canales" (línea telefónica,
--   sede, app de la EPS). La probabilidad de que un horario esté ocupado sube a
--   medida que se acerca la fecha y se calibra con el estándar MGTE de cada
--   especialidad (Circular 038 de 2025): la primera cita libre tiende a quedar
--   alrededor del tiempo de espera oficial. Determinista (hash del horario) y
--   monótona: un horario ocupado nunca se libera solo.
-- - mantener_agenda: limpia lo vencido, extiende la ventana y aplica la demanda.
--   Se ejecuta a diario con pg_cron a las 00:10 de Bogotá.
--
-- Parámetros del modelo (supuestos declarados, no datos oficiales):
--   ocupación 97 % si faltan < 0,5·T días; decrece linealmente hasta 55 % en
--   1,5·T; 45 % desde ahí. T = días máximos MGTE de la especialidad, o 20 si la
--   circular no fija estándar. Jornada: 07:00–12:00 y 14:00–17:00.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;

create or replace function private.hoy_bogota()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'America/Bogota')::date $$;

-- Número pseudoaleatorio estable en [0, 1) para un horario concreto.
create or replace function private.azar_horario(p_medico uuid, p_fecha date, p_hora time)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select ('x' || substr(md5(p_medico::text || '|' || p_fecha::text || '|' || p_hora::text), 1, 8))::bit(32)::bigint
         / 4294967296.0
$$;

create or replace function private.probabilidad_ocupado(p_dias_anticipacion integer, p_dias_mgte integer)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select case
    when p_dias_anticipacion < 0.5 * t then 0.97
    when p_dias_anticipacion < 1.5 * t then 0.97 - 0.42 * (p_dias_anticipacion - 0.5 * t) / t
    else 0.45
  end
  from (select coalesce(p_dias_mgte, 20)::double precision as t) as p
$$;

create or replace function private.generar_agenda(p_dias integer default 60)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoy date := private.hoy_bogota();
  v_creados integer;
begin
  insert into public.availability_slots (doctor_id, date, start_time, end_time)
  select d.id, f.fecha::date, h.inicio::time, (h.inicio + make_interval(mins => d.duracion_cita_min))::time
    from public.doctors d
    cross join generate_series(v_hoy, v_hoy + p_dias, interval '1 day') as f(fecha)
    cross join lateral (
      select generate_series(timestamp '2000-01-01 07:00', timestamp '2000-01-01 12:00' - make_interval(mins => d.duracion_cita_min), make_interval(mins => d.duracion_cita_min))
      union all
      select generate_series(timestamp '2000-01-01 14:00', timestamp '2000-01-01 17:00' - make_interval(mins => d.duracion_cita_min), make_interval(mins => d.duracion_cita_min))
    ) as h(inicio)
   where d.active
     and d.license_number like 'SIM-%'
     and extract(isodow from f.fecha)::smallint = any (d.dias_atencion)
  on conflict (doctor_id, date, start_time) do nothing;
  get diagnostics v_creados = row_count;
  return v_creados;
end;
$$;

create or replace function private.simular_demanda()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoy date := private.hoy_bogota();
  v_ocupados integer;
begin
  update public.availability_slots s
     set is_booked = true, ocupado_otro_canal = true
    from public.doctors d
    join public.specialties sp on sp.id = d.specialty_id
   where s.doctor_id = d.id
     and not s.is_booked
     and s.date >= v_hoy
     and private.azar_horario(s.doctor_id, s.date, s.start_time)
         < private.probabilidad_ocupado(s.date - v_hoy, sp.dias_max_mgte);
  get diagnostics v_ocupados = row_count;
  return v_ocupados;
end;
$$;

create or replace function private.mantener_agenda()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoy date := private.hoy_bogota();
  v_borrados integer;
  v_creados integer;
  v_ocupados integer;
begin
  -- Horarios vencidos sin cita de CitasYA (libres u ocupados por otros canales).
  delete from public.availability_slots s
   where s.date < v_hoy
     and not exists (select 1 from public.appointments a where a.slot_id = s.id);
  get diagnostics v_borrados = row_count;

  v_creados := private.generar_agenda(60);
  v_ocupados := private.simular_demanda();

  return jsonb_build_object('fecha', v_hoy, 'borrados', v_borrados, 'creados', v_creados, 'ocupados_otro_canal', v_ocupados);
end;
$$;

revoke all on function private.generar_agenda(integer), private.simular_demanda(), private.mantener_agenda()
  from public, anon, authenticated;

-- Tarea diaria: 05:10 UTC = 00:10 en Bogotá (UTC−5, sin horario de verano).
select cron.schedule('citasya-mantener-agenda', '10 5 * * *', 'select private.mantener_agenda()');

-- Primera ejecución.
select private.mantener_agenda();
