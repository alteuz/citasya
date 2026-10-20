-- ════════════════════════════════════════════════════════════════════════════
-- Modelo familiar (cuenta de cuidador). Trazabilidad: RF-13, ADR-0008.
--
-- El titular, que es la persona con la cuenta, registra a los familiares a su
-- cargo (hijos, padres mayores, cónyuge, etc.) y agenda citas para ellos.
-- Cada familiar tiene su propia EPS, que puede ser distinta de la del titular.
-- El familiar no tiene cuenta ni contraseña: lo administra el titular, que
-- recibe las notificaciones y puede cancelar o reprogramar sus citas.
--
-- Decisiones:
--  - La cita sigue perteneciendo al titular (appointments.patient_id);
--    familiar_id indica para quién es. Así no cambian las políticas RLS ni
--    las funciones de cancelar y reprogramar: el titular ve y gestiona todo.
--  - Las escrituras sobre familiares pasan por funciones transaccionales, con
--    validación y mensajes para el paciente, igual que las citas.
--  - Retirar a un familiar es una baja lógica (activo = false), de modo que
--    su historial de citas se conserva.
--  - Ley 1581 de 2012: solo se guardan datos mínimos, sin datos de salud. El
--    titular declara ser su representante o tener su autorización
--    (autorizacion_en).
--  - La regla de una cita activa por especialidad se aplica a cada persona
--    por separado: al titular y a cada familiar.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Tabla de familiares ─────────────────────────────────────────────────
create table public.familiares (
  id uuid primary key default gen_random_uuid(),
  titular_id uuid not null references public.profiles(id) on delete cascade,
  nombre_completo text not null,
  tipo_documento text not null,
  numero_documento text not null,
  fecha_nacimiento date not null,
  parentesco text not null,
  eps_id uuid not null references public.eps(id),
  autorizacion_en timestamptz not null default now(),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint familiares_nombre_longitud check (char_length(btrim(nombre_completo)) between 3 and 120),
  constraint familiares_tipo_documento check (tipo_documento in ('RC', 'TI', 'CC', 'CE', 'PA')),
  constraint familiares_numero_documento check (numero_documento ~ '^[0-9A-Z]{4,15}$'),
  constraint familiares_fecha_nacimiento check (fecha_nacimiento >= date '1900-01-01'),
  constraint familiares_parentesco check (parentesco in ('hijo', 'padre_madre', 'conyuge', 'hermano', 'abuelo', 'nieto', 'otro'))
);

comment on table public.familiares is
  'Familiares a cargo de un titular (cuenta de cuidador, RF-13). No tienen cuenta propia: los administra el titular.';
comment on column public.familiares.autorizacion_en is
  'Momento en que el titular declaró ser su representante o tener su autorización (Ley 1581 de 2012).';

-- Un documento no se repite entre los familiares activos de un mismo titular.
create unique index familiares_documento_unico
  on public.familiares (titular_id, tipo_documento, numero_documento) where activo;
create index idx_familiares_titular on public.familiares (titular_id);
create index idx_familiares_eps on public.familiares (eps_id);

alter table public.familiares enable row level security;

-- Cada titular ve solo a sus familiares; el administrador ve a todos. No hay
-- escrituras directas: se hacen con las funciones de la sección 3.
create policy familiares_lectura on public.familiares for select to authenticated
  using (titular_id = (select auth.uid()) or (select private.es_admin()));

revoke all on public.familiares from anon;
revoke insert, update, delete, truncate on public.familiares from authenticated;
grant select on public.familiares to authenticated;

-- ─── 2. Para quién es la cita ───────────────────────────────────────────────
alter table public.appointments
  add column familiar_id uuid references public.familiares(id) on delete restrict;
create index idx_appointments_familiar on public.appointments (familiar_id);

comment on column public.appointments.familiar_id is
  'Familiar para quien es la cita; es nulo cuando la cita es del titular (patient_id).';

-- Indica si una persona (el titular o uno de sus familiares) tiene citas activas
-- que aún no han empezado. Solo la invocan funciones SECURITY DEFINER.
create or replace function private.citas_proximas_de(p_titular uuid, p_familiar uuid, p_especialidad uuid default null)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
      from public.appointments a
      join public.availability_slots s on s.id = a.slot_id
     where a.patient_id = p_titular
       and a.familiar_id is not distinct from p_familiar
       and (p_especialidad is null or a.specialty_id = p_especialidad)
       and a.status in ('scheduled', 'rescheduled')
       and private.inicio_horario(s.date, s.start_time) > now()
  );
$$;
revoke all on function private.citas_proximas_de(uuid, uuid, uuid) from public, anon, authenticated;

-- ─── 3. Registrar, editar y retirar familiares ──────────────────────────────
create or replace function public.guardar_familiar(
  p_nombre text,
  p_tipo_documento text,
  p_numero_documento text,
  p_fecha_nacimiento date,
  p_parentesco text,
  p_eps_id uuid,
  p_autorizacion boolean default false,
  p_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_titular uuid := (select auth.uid());
  v_nombre text := btrim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g'));
  v_documento text := upper(btrim(coalesce(p_numero_documento, '')));
  v_hoy date := (now() at time zone 'America/Bogota')::date;
  v_eps_actual uuid;
  v_id uuid;
begin
  if v_titular is null then
    raise exception using errcode = 'P0001', message = 'NO_AUTENTICADO',
      detail = 'Debes iniciar sesión.';
  end if;
  if char_length(v_nombre) not between 3 and 120 then
    raise exception using errcode = 'P0001', message = 'NOMBRE_INVALIDO',
      detail = 'Escribe el nombre completo de tu familiar.';
  end if;
  if p_tipo_documento is null or p_tipo_documento not in ('RC', 'TI', 'CC', 'CE', 'PA') then
    raise exception using errcode = 'P0001', message = 'TIPO_DOCUMENTO_INVALIDO',
      detail = 'Selecciona el tipo de documento.';
  end if;
  if v_documento !~ '^[0-9A-Z]{4,15}$' then
    raise exception using errcode = 'P0001', message = 'DOCUMENTO_INVALIDO',
      detail = 'El número de documento debe tener entre 4 y 15 letras o números, sin puntos ni espacios.';
  end if;
  if p_fecha_nacimiento is null or p_fecha_nacimiento > v_hoy or p_fecha_nacimiento < date '1900-01-01' then
    raise exception using errcode = 'P0001', message = 'FECHA_NACIMIENTO_INVALIDA',
      detail = 'Revisa la fecha de nacimiento.';
  end if;
  if p_parentesco is null or p_parentesco not in ('hijo', 'padre_madre', 'conyuge', 'hermano', 'abuelo', 'nieto', 'otro') then
    raise exception using errcode = 'P0001', message = 'PARENTESCO_INVALIDO',
      detail = 'Selecciona el parentesco.';
  end if;
  if not exists (select 1 from public.eps where id = p_eps_id and active) then
    raise exception using errcode = 'P0001', message = 'EPS_INVALIDA',
      detail = 'Selecciona una EPS de la lista.';
  end if;
  if p_tipo_documento = 'CC'
     and exists (select 1 from public.profiles where id = v_titular and cedula = v_documento) then
    raise exception using errcode = 'P0001', message = 'FAMILIAR_ES_TITULAR',
      detail = 'Ese documento es el tuyo. Para tus propias citas, elige «Para mí».';
  end if;

  if p_id is null then
    if not coalesce(p_autorizacion, false) then
      raise exception using errcode = 'P0001', message = 'AUTORIZACION_REQUERIDA',
        detail = 'Confirma que eres su representante o que tienes su autorización.';
    end if;
    if (select count(*) from public.familiares where titular_id = v_titular and activo) >= 10 then
      raise exception using errcode = 'P0001', message = 'LIMITE_FAMILIARES',
        detail = 'Puedes registrar hasta 10 familiares.';
    end if;
    insert into public.familiares
      (titular_id, nombre_completo, tipo_documento, numero_documento, fecha_nacimiento, parentesco, eps_id)
    values
      (v_titular, v_nombre, p_tipo_documento, v_documento, p_fecha_nacimiento, p_parentesco, p_eps_id)
    returning id into v_id;
  else
    select eps_id into v_eps_actual
      from public.familiares
     where id = p_id and titular_id = v_titular and activo
       for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'FAMILIAR_NO_EXISTE',
        detail = 'Esa persona no está en tu grupo familiar.';
    end if;
    -- Si se cambiara la EPS teniendo citas próximas, esas citas quedarían con médicos de otra red.
    if v_eps_actual <> p_eps_id and private.citas_proximas_de(v_titular, p_id) then
      raise exception using errcode = 'P0001', message = 'FAMILIAR_CON_CITAS',
        detail = 'Tu familiar tiene citas próximas con su EPS actual. Cancélalas antes de cambiarle la EPS.';
    end if;
    update public.familiares
       set nombre_completo = v_nombre,
           tipo_documento = p_tipo_documento,
           numero_documento = v_documento,
           fecha_nacimiento = p_fecha_nacimiento,
           parentesco = p_parentesco,
           eps_id = p_eps_id,
           actualizado_en = now()
     where id = p_id
    returning id into v_id;
  end if;

  return v_id;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'FAMILIAR_DUPLICADO',
      detail = 'Ya registraste a una persona con ese documento.';
end;
$$;

create or replace function public.retirar_familiar(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_titular uuid := (select auth.uid());
begin
  if v_titular is null then
    raise exception using errcode = 'P0001', message = 'NO_AUTENTICADO',
      detail = 'Debes iniciar sesión.';
  end if;

  perform 1 from public.familiares
   where id = p_id and titular_id = v_titular and activo
     for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'FAMILIAR_NO_EXISTE',
      detail = 'Esa persona no está en tu grupo familiar.';
  end if;
  if private.citas_proximas_de(v_titular, p_id) then
    raise exception using errcode = 'P0001', message = 'FAMILIAR_CON_CITAS',
      detail = 'Tu familiar tiene citas próximas. Cancélalas antes de retirarlo de tu familia.';
  end if;

  update public.familiares set activo = false, actualizado_en = now() where id = p_id;
end;
$$;

-- ─── 4. Reservar para el titular o para un familiar ─────────────────────────
-- Se reemplaza la versión de tres argumentos: si existieran las dos, la API no
-- podría elegir cuál invocar.
drop function if exists public.reservar_cita(uuid, text, text);

create function public.reservar_cita(
  p_slot_id uuid,
  p_modo text default 'presencial',
  p_notas text default null,
  p_familiar_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_titular uuid := (select auth.uid());
  v_eps_paciente uuid;
  v_horario record;
  v_cita uuid;
begin
  if v_titular is null then
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

  -- EPS de la persona que va a la cita: el titular o su familiar.
  if p_familiar_id is null then
    select eps_id into v_eps_paciente from public.profiles where id = v_titular;
    if v_eps_paciente is null then
      raise exception using errcode = 'P0001', message = 'PERFIL_SIN_EPS',
        detail = 'Tu perfil no tiene una EPS registrada. Regístrala en «Tu información», en tu panel.';
    end if;
  else
    select eps_id into v_eps_paciente
      from public.familiares
     where id = p_familiar_id and titular_id = v_titular and activo;
    if not found then
      raise exception using errcode = 'P0001', message = 'FAMILIAR_NO_EXISTE',
        detail = 'Esa persona no está en tu grupo familiar.';
    end if;
  end if;

  -- Se bloquea la fila del horario para que dos reservas simultáneas se serialicen aquí.
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
      detail = case when p_familiar_id is null
                    then 'Este médico no pertenece a la red de tu EPS.'
                    else 'Este médico no pertenece a la red de la EPS de tu familiar.' end;
  end if;
  -- Una cita activa por especialidad y por persona; las citas vencidas no cuentan (H-36).
  if private.citas_proximas_de(v_titular, p_familiar_id, v_horario.specialty_id) then
    raise exception using errcode = 'P0001', message = 'CITA_DUPLICADA_ESPECIALIDAD',
      detail = case when p_familiar_id is null
                    then 'Ya tienes una cita activa en esta especialidad. Puedes reprogramarla.'
                    else 'Tu familiar ya tiene una cita activa en esta especialidad. Puedes reprogramarla.' end;
  end if;

  update public.availability_slots set is_booked = true where id = p_slot_id;

  insert into public.appointments (patient_id, familiar_id, doctor_id, slot_id, eps_id, specialty_id, mode, notes)
  values (v_titular, p_familiar_id, v_horario.medico, p_slot_id, v_horario.eps_id, v_horario.specialty_id,
          p_modo, nullif(trim(p_notas), ''))
  returning id into v_cita;

  return v_cita;
end;
$$;

-- ─── 5. Privilegios: solo usuarios con sesión ───────────────────────────────
revoke all on function public.reservar_cita(uuid, text, text, uuid) from public, anon;
revoke all on function public.guardar_familiar(text, text, text, date, text, uuid, boolean, uuid) from public, anon;
revoke all on function public.retirar_familiar(uuid) from public, anon;
grant execute on function public.reservar_cita(uuid, text, text, uuid) to authenticated;
grant execute on function public.guardar_familiar(text, text, text, date, text, uuid, boolean, uuid) to authenticated;
grant execute on function public.retirar_familiar(uuid) to authenticated;
