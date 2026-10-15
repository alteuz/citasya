-- ════════════════════════════════════════════════════════════════════════════
-- Citas vencidas y EPS del perfil
-- Trazabilidad: H-36 y H-37 (revisión del 15-oct-2026).
--
--   H-36  Una cita «programada» cuya fecha ya pasó seguía contando como activa
--         para la regla «una cita activa por especialidad». Así, el paciente
--         no podía pedir otra cita de esa especialidad. Ahora la regla solo
--         considera las citas que aún no han empezado (hora de Bogotá), y la
--         interfaz deja de mostrar las vencidas como próximas.
--   H-37  Los perfiles creados antes de que el registro exigiera la EPS
--         quedaron sin EPS y no podían reservar (PERFIL_SIN_EPS). Ahora el
--         paciente puede registrarla una sola vez desde «Tu información».
--         Cambiarla después no se permite desde la aplicación: la columna
--         sigue protegida (H-35).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── H-36: la regla de duplicados ignora las citas vencidas ─────────────────
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
      detail = 'Tu perfil no tiene una EPS registrada. Regístrala en «Tu información», en tu panel.';
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
  -- Solo cuentan las citas activas que aún no han empezado (H-36).
  if exists (
    select 1
      from public.appointments a
      join public.availability_slots s on s.id = a.slot_id
     where a.patient_id = v_paciente
       and a.specialty_id = v_horario.specialty_id
       and a.status in ('scheduled', 'rescheduled')
       and private.inicio_horario(s.date, s.start_time) > now()
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

-- ─── H-37: registrar la EPS del perfil cuando falta (una sola vez) ──────────
create or replace function public.asignar_mi_eps(p_eps_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paciente uuid := (select auth.uid());
  v_actual uuid;
begin
  if v_paciente is null then
    raise exception using errcode = 'P0001', message = 'NO_AUTENTICADO',
      detail = 'Debes iniciar sesión.';
  end if;
  if not exists (select 1 from public.eps where id = p_eps_id and active) then
    raise exception using errcode = 'P0001', message = 'EPS_INVALIDA',
      detail = 'Selecciona una EPS de la lista.';
  end if;

  select eps_id into v_actual from public.profiles where id = v_paciente for update;
  if v_actual is not null then
    raise exception using errcode = 'P0001', message = 'EPS_YA_REGISTRADA',
      detail = 'Tu EPS ya está registrada. El cambio de EPS no se hace desde la aplicación.';
  end if;

  update public.profiles set eps_id = p_eps_id where id = v_paciente;
end;
$$;

revoke all on function public.asignar_mi_eps(uuid) from public, anon;
grant execute on function public.asignar_mi_eps(uuid) to authenticated;

comment on function public.asignar_mi_eps(uuid) is
  'Registra la EPS del paciente autenticado solo si su perfil no tiene una (H-37). No permite cambiarla.';
