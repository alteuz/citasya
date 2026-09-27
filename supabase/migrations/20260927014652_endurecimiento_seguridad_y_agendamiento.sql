-- ════════════════════════════════════════════════════════════════════════════
-- Endurecimiento de seguridad y agendamiento transaccional
-- Trazabilidad: H-20..H-27 (Supabase Advisors), H-32..H-35 (análisis manual),
--               R-03 (agendamiento robusto), ADR-0005. OWASP A01/A04/A07/A08.
--
-- Hallazgos que corrige:
--   H-35 (crítico) Un paciente podía cambiar su propio `role` a 'admin'
--                  (UPDATE sin restricción de columnas sobre profiles).
--   H-35b          Un paciente podía modificar cualquier columna de su cita
--                  (estado, médico, EPS) con UPDATE directo.
--   H-34           UNIQUE(slot_id) incondicional: un horario cancelado no se
--                  podía volver a reservar nunca.
--   H-33           Regla de 24 h calculada en UTC (servidor), no en hora de
--                  Bogotá: ventana desfasada 5 horas.
--   H-20/H-22      Funciones SECURITY DEFINER ejecutables por anon/authenticated.
--   H-21           check_cedula_exists permitía enumerar cédulas sin sesión.
--   H-24           search_path mutable.
--   H-25/H-26      Políticas RLS con auth.uid() por fila y permisivas múltiples.
--   H-27           Llaves foráneas sin índice.
--   H-32           Deriva de esquema: funciones creadas fuera de migraciones.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 0. Esquema privado (no expuesto por la API REST) ───────────────────────
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function private.es_admin() from public;
grant execute on function private.es_admin() to anon, authenticated;

comment on function private.es_admin() is
  'Verdadero si el usuario autenticado es administrador. Vive en un esquema no expuesto para que no sea invocable por /rest/v1/rpc.';

-- Instante de inicio de un horario, interpretado en hora de Bogotá (H-33).
create or replace function private.inicio_horario(p_fecha date, p_hora time)
returns timestamptz
language sql
stable  -- las reglas de zona horaria pueden cambiar por ley
set search_path = ''
as $$
  select (p_fecha + p_hora) at time zone 'America/Bogota';
$$;
grant execute on function private.inicio_horario(date, time) to anon, authenticated;

-- ─── 1. Políticas RLS: una por tabla y acción, con (select auth.uid()) ──────
do $$
declare r record;
begin
  for r in
    select polname, c.relname
    from pg_policy p join pg_class c on c.oid = p.polrelid
    where c.relnamespace = 'public'::regnamespace
      and c.relname in ('profiles','appointments','availability_slots','doctors','eps','specialties','notifications')
  loop
    execute format('drop policy %I on public.%I', r.polname, r.relname);
  end loop;
end $$;

-- Catálogos públicos: lectura para todos; escritura solo administradores.
create policy eps_lectura on public.eps for select using (true);
create policy eps_admin_escritura on public.eps for all to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

create policy especialidades_lectura on public.specialties for select using (true);
create policy especialidades_admin_escritura on public.specialties for all to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

create policy medicos_lectura on public.doctors for select
  using (active or (select private.es_admin()));
create policy medicos_admin_escritura on public.doctors for all to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

create policy horarios_lectura on public.availability_slots for select using (true);
create policy horarios_admin_escritura on public.availability_slots for all to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

-- Perfiles: cada paciente ve y edita el suyo; el administrador ve todos.
-- (El perfil lo crea el trigger handle_new_user; no hay INSERT desde el cliente.)
create policy perfiles_lectura on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.es_admin()));
create policy perfiles_actualizacion_propia on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Citas: el paciente solo LEE las suyas. Reservar, cancelar y reprogramar se
-- hace exclusivamente con las funciones transaccionales (sección 4).
create policy citas_lectura on public.appointments for select to authenticated
  using (patient_id = (select auth.uid()) or (select private.es_admin()));
create policy citas_admin_escritura on public.appointments for all to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

create policy notificaciones_lectura on public.notifications for select to authenticated
  using (
    (select private.es_admin())
    or exists (
      select 1 from public.appointments a
      where a.id = notifications.appointment_id and a.patient_id = (select auth.uid())
    )
  );
create policy notificaciones_admin_escritura on public.notifications for all to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

-- ─── 2. Privilegios de tabla y columna (defensa en profundidad bajo RLS) ────
-- anon (visitante sin sesión) solo puede leer.
revoke insert, update, delete, truncate on all tables in schema public from anon;
revoke truncate on all tables in schema public from authenticated;
-- H-35: un paciente solo puede modificar su nombre y teléfono; nunca su rol,
-- cédula, correo ni EPS. Sin este límite, RLS permitía `role = 'admin'`.
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- ─── 3. Integridad de la reserva (H-34) e índices (H-27) ────────────────────
alter table public.appointments drop constraint if exists unique_active_slot;
create unique index if not exists citas_un_activo_por_horario
  on public.appointments (slot_id)
  where status in ('scheduled', 'rescheduled');

create index if not exists idx_appointments_eps on public.appointments (eps_id);
create index if not exists idx_appointments_specialty on public.appointments (specialty_id);

alter table public.appointments
  add constraint citas_notas_longitud check (notes is null or char_length(notes) <= 500) not valid,
  add constraint citas_motivo_longitud check (cancellation_reason is null or char_length(cancellation_reason) <= 300) not valid;

-- ─── 4. Funciones de agendamiento (única vía de escritura del paciente) ─────
-- Errores con código estable en MESSAGE y texto para el paciente en DETAIL.

create or replace function public.reservar_cita(
  p_slot_id uuid,
  p_modo text default 'presencial',
  p_notas text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paciente uuid := (select auth.uid());
  v_eps_paciente uuid;
  v_horario record;
  v_cita uuid;
begin
  if v_paciente is null then
    raise exception using errcode = 'P0001', message = 'NO_AUTENTICADO',
      detail = 'Debes iniciar sesión para agendar una cita.';
  end if;
  if p_modo is null or p_modo not in ('presencial', 'telemedicina') then
    raise exception using errcode = 'P0001', message = 'MODALIDAD_INVALIDA',
      detail = 'La modalidad debe ser presencial o telemedicina.';
  end if;
  if p_notas is not null and char_length(p_notas) > 500 then
    raise exception using errcode = 'P0001', message = 'NOTAS_DEMASIADO_LARGAS',
      detail = 'Las notas no pueden superar 500 caracteres.';
  end if;

  select eps_id into v_eps_paciente from public.profiles where id = v_paciente;
  if v_eps_paciente is null then
    raise exception using errcode = 'P0001', message = 'PERFIL_SIN_EPS',
      detail = 'Tu perfil no tiene una EPS asociada.';
  end if;

  -- Bloqueo de la fila del horario: dos reservas simultáneas se serializan aquí.
  select s.id, s.date, s.start_time, s.is_booked, d.id as medico, d.eps_id, d.specialty_id, d.active
    into v_horario
    from public.availability_slots s
    join public.doctors d on d.id = s.doctor_id
   where s.id = p_slot_id
     for update of s;

  if not found or not v_horario.active then
    raise exception using errcode = 'P0001', message = 'HORARIO_NO_EXISTE',
      detail = 'El horario seleccionado no existe.';
  end if;
  if v_horario.is_booked then
    raise exception using errcode = 'P0001', message = 'HORARIO_NO_DISPONIBLE',
      detail = 'Otra persona acaba de reservar este horario. Elige otro, por favor.';
  end if;
  if private.inicio_horario(v_horario.date, v_horario.start_time) <= now() then
    raise exception using errcode = 'P0001', message = 'HORARIO_PASADO',
      detail = 'Ese horario ya pasó. Elige uno futuro.';
  end if;
  if v_horario.eps_id <> v_eps_paciente then
    raise exception using errcode = 'P0001', message = 'EPS_NO_CORRESPONDE',
      detail = 'Este médico no pertenece a la red de tu EPS.';
  end if;
  if exists (
    select 1 from public.appointments a
    where a.patient_id = v_paciente
      and a.specialty_id = v_horario.specialty_id
      and a.status in ('scheduled', 'rescheduled')
  ) then
    raise exception using errcode = 'P0001', message = 'CITA_DUPLICADA_ESPECIALIDAD',
      detail = 'Ya tienes una cita activa en esta especialidad. Puedes reprogramarla.';
  end if;

  update public.availability_slots set is_booked = true where id = p_slot_id;

  insert into public.appointments (patient_id, doctor_id, slot_id, eps_id, specialty_id, mode, notes)
  values (v_paciente, v_horario.medico, p_slot_id, v_horario.eps_id, v_horario.specialty_id,
          p_modo, nullif(trim(p_notas), ''))
  returning id into v_cita;

  return v_cita;
end;
$$;

create or replace function public.cancelar_cita(p_cita_id uuid, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cita record;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = 'P0001', message = 'NO_AUTENTICADO',
      detail = 'Debes iniciar sesión.';
  end if;

  select a.id, a.status, a.slot_id, s.date, s.start_time
    into v_cita
    from public.appointments a
    join public.availability_slots s on s.id = a.slot_id
   where a.id = p_cita_id and a.patient_id = (select auth.uid())
     for update of a;

  if not found then
    raise exception using errcode = 'P0001', message = 'CITA_NO_EXISTE',
      detail = 'La cita no existe o no te pertenece.';
  end if;
  if v_cita.status not in ('scheduled', 'rescheduled') then
    raise exception using errcode = 'P0001', message = 'CITA_NO_ACTIVA',
      detail = 'Esta cita ya no está activa.';
  end if;
  if private.inicio_horario(v_cita.date, v_cita.start_time) - now() < interval '24 hours' then
    raise exception using errcode = 'P0001', message = 'FUERA_DE_PLAZO',
      detail = 'Solo puedes cancelar con al menos 24 horas de anticipación.';
  end if;

  update public.appointments
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = left(coalesce(nullif(trim(p_motivo), ''), 'Cancelado por el paciente'), 300)
   where id = p_cita_id;

  update public.availability_slots set is_booked = false where id = v_cita.slot_id;
end;
$$;

create or replace function public.reprogramar_cita(
  p_cita_id uuid,
  p_nuevo_slot_id uuid,
  p_modo text default null,
  p_notas text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cita record;
  v_nuevo record;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = 'P0001', message = 'NO_AUTENTICADO',
      detail = 'Debes iniciar sesión.';
  end if;
  if p_modo is not null and p_modo not in ('presencial', 'telemedicina') then
    raise exception using errcode = 'P0001', message = 'MODALIDAD_INVALIDA',
      detail = 'La modalidad debe ser presencial o telemedicina.';
  end if;
  if p_notas is not null and char_length(p_notas) > 500 then
    raise exception using errcode = 'P0001', message = 'NOTAS_DEMASIADO_LARGAS',
      detail = 'Las notas no pueden superar 500 caracteres.';
  end if;

  select a.id, a.status, a.slot_id, a.doctor_id, s.date, s.start_time
    into v_cita
    from public.appointments a
    join public.availability_slots s on s.id = a.slot_id
   where a.id = p_cita_id and a.patient_id = (select auth.uid())
     for update of a;

  if not found then
    raise exception using errcode = 'P0001', message = 'CITA_NO_EXISTE',
      detail = 'La cita no existe o no te pertenece.';
  end if;
  if v_cita.status not in ('scheduled', 'rescheduled') then
    raise exception using errcode = 'P0001', message = 'CITA_NO_ACTIVA',
      detail = 'Esta cita ya no está activa.';
  end if;
  if private.inicio_horario(v_cita.date, v_cita.start_time) - now() < interval '24 hours' then
    raise exception using errcode = 'P0001', message = 'FUERA_DE_PLAZO',
      detail = 'Solo puedes reprogramar con al menos 24 horas de anticipación.';
  end if;

  select s.id, s.date, s.start_time, s.is_booked, s.doctor_id
    into v_nuevo
    from public.availability_slots s
   where s.id = p_nuevo_slot_id
     for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'HORARIO_NO_EXISTE',
      detail = 'El horario seleccionado no existe.';
  end if;
  if v_nuevo.doctor_id <> v_cita.doctor_id then
    raise exception using errcode = 'P0001', message = 'MEDICO_DISTINTO',
      detail = 'La reprogramación debe ser con el mismo médico.';
  end if;
  if v_nuevo.is_booked then
    raise exception using errcode = 'P0001', message = 'HORARIO_NO_DISPONIBLE',
      detail = 'Otra persona acaba de reservar este horario. Elige otro, por favor.';
  end if;
  if private.inicio_horario(v_nuevo.date, v_nuevo.start_time) <= now() then
    raise exception using errcode = 'P0001', message = 'HORARIO_PASADO',
      detail = 'Ese horario ya pasó. Elige uno futuro.';
  end if;

  update public.availability_slots set is_booked = false where id = v_cita.slot_id;
  update public.availability_slots set is_booked = true where id = p_nuevo_slot_id;
  update public.appointments
     set slot_id = p_nuevo_slot_id,
         mode = coalesce(p_modo, mode),
         notes = case when p_notas is null then notes else nullif(trim(p_notas), '') end
   where id = p_cita_id;
end;
$$;

revoke all on function public.reservar_cita(uuid, text, text) from public, anon;
revoke all on function public.cancelar_cita(uuid, text) from public, anon;
revoke all on function public.reprogramar_cita(uuid, uuid, text, text) from public, anon;
grant execute on function public.reservar_cita(uuid, text, text) to authenticated;
grant execute on function public.cancelar_cita(uuid, text) to authenticated;
grant execute on function public.reprogramar_cita(uuid, uuid, text, text) to authenticated;

-- ─── 5. Triggers heredados ───────────────────────────────────────────────────
-- La sincronización de horarios la hacen ahora las funciones anteriores (el
-- paciente ya no escribe en la tabla). Los triggers de sincronización se
-- eliminan para no duplicar la lógica; la validación de 24 h se conserva como
-- defensa para escrituras administrativas, ya en hora de Bogotá (H-33).
drop trigger if exists after_appointment_created on public.appointments;
drop trigger if exists after_appointment_update on public.appointments;
drop function if exists public.book_slot_on_appointment();
drop function if exists public.sync_slots_on_appointment_update();
drop function if exists public.release_slot_on_cancellation();  -- sin uso
drop function if exists public.validate_cancellation();        -- sin uso

create or replace function public.validate_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fecha date;
  v_hora time;
begin
  if (new.status = 'cancelled' and old.status <> 'cancelled') or (new.slot_id <> old.slot_id) then
    select date, start_time into v_fecha, v_hora
      from public.availability_slots where id = old.slot_id;
    if private.inicio_horario(v_fecha, v_hora) - now() < interval '24 hours'
       and not (select private.es_admin()) then
      raise exception using errcode = 'P0001', message = 'FUERA_DE_PLAZO',
        detail = 'No se puede cancelar ni reprogramar con menos de 24 horas de anticipación.';
    end if;
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      new.cancelled_at := coalesce(new.cancelled_at, now());
    end if;
  end if;
  return new;
end;
$$;

-- ─── 6. Registro: el perfil completo lo crea el trigger (H-21) ──────────────
-- El cliente ya no consulta si una cédula existe (oráculo de enumeración).
-- La unicidad la garantiza profiles_cedula_key dentro del mismo registro.
drop function if exists public.check_cedula_exists(text);

alter table public.profiles
  add constraint perfiles_cedula_formato check (cedula ~ '^[0-9]{5,10}$') not valid;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eps uuid;
begin
  -- Solo se acepta una EPS activa existente; cualquier otro valor queda nulo.
  select id into v_eps
    from public.eps
   where id::text = new.raw_user_meta_data->>'eps_id' and active;

  insert into public.profiles (id, email, cedula, full_name, phone, eps_id, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'cedula', ''),
    left(coalesce(new.raw_user_meta_data->>'full_name', ''), 120),
    left(coalesce(new.raw_user_meta_data->>'phone', ''), 20),
    v_eps,
    'patient'   -- el rol nunca se toma de datos enviados por el cliente
  );
  return new;
end;
$$;

-- ─── 7. Ninguna función interna es invocable por la API (H-20, H-22) ────────
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.validate_appointment_change() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

drop function if exists public.is_admin();
