-- ════════════════════════════════════════════════════════════════════════════
-- Interoperabilidad HL7 FHIR R4 (Sprint 3, OE-3, ADR-0009)
--
-- Patrón «transactional outbox»: cada cambio de una cita que importa a FHIR
-- (reserva, cancelación, reprogramación, cambio de modalidad o de paciente)
-- deja un evento en private.fhir_outbox dentro de la MISMA transacción. Si la
-- transacción se revierte, el evento no existe; si se confirma, el evento
-- espera aunque el servidor FHIR no esté disponible.
--
-- La Edge Function fhir-sync toma los eventos (FOR UPDATE SKIP LOCKED), publica
-- cada cita en un Bundle de transacción y guarda en private.fhir_vinculos el id
-- y la versión de cada recurso, que se usa en If-Match. pg_net la despierta
-- apenas se confirma un cambio y pg_cron la vuelve a llamar cada minuto
-- mientras queden eventos por publicar.
--
-- Privacidad (Ley 1581 de 2012): ningún dato personal sale de la base. Las
-- funciones de lectura arman solo lo que el mapeador necesita, y el paciente se
-- identifica con un HMAC-SHA-256 cuya clave vive en Vault y no sale de la base.
-- No viajan nombre, documento, teléfono, correo, fecha de nacimiento, notas ni
-- el motivo escrito de una cancelación; tampoco el teléfono o el correo del médico.
-- ════════════════════════════════════════════════════════════════════════════

-- pg_net crea sus funciones en el esquema net; el registro de la extensión va en
-- extensions, como las demás (evita el aviso «extension_in_public» del linter).
create extension if not exists pg_net with schema extensions;

-- ── Secretos en Vault: se generan aquí y nunca salen de la base ─────────────
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'fhir_seudonimo_clave') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'), 'fhir_seudonimo_clave',
      'Clave HMAC que seudonimiza al paciente en FHIR (ADR-0009). Cambiarla cambia todos los seudónimos.');
  end if;
  if not exists (select 1 from vault.secrets where name = 'fhir_sync_clave') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'), 'fhir_sync_clave',
      'Clave con la que pg_net y pg_cron invocan la Edge Function fhir-sync (ADR-0009).');
  end if;
end $$;

-- ── Tablas (esquema private: PostgREST no lo expone) ─────────────────────────

create table private.fhir_outbox (
  id bigint generated always as identity primary key,
  tabla text not null default 'appointments' check (tabla = 'appointments'),
  id_local uuid not null,
  -- Franja que la cita dejó al reprogramarse: debe quedar libre en el servidor.
  franja_anterior uuid,
  creado_en timestamptz not null default now(),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'procesando', 'publicado', 'conflicto', 'fallido')),
  intentos integer not null default 0,
  proximo_intento_en timestamptz not null default now(),
  bloqueado_hasta timestamptz,
  procesado_en timestamptz,
  servidor text,
  ultimo_error text
);
comment on table private.fhir_outbox is
  'Outbox transaccional de eventos de cita hacia el servidor FHIR (ADR-0009). La escribe el disparador fhir_outbox_cita.';
create index fhir_outbox_por_publicar on private.fhir_outbox (proximo_intento_en, id)
  where estado in ('pendiente', 'procesando');
create index fhir_outbox_por_cita on private.fhir_outbox (id_local);

create table private.fhir_vinculos (
  servidor text not null,
  recurso text not null,
  clave_local text not null,
  id_fhir text not null,
  version text not null,
  actualizado_en timestamptz not null default now(),
  primary key (servidor, recurso, clave_local)
);
comment on table private.fhir_vinculos is
  'Recurso FHIR (id lógico y versión) de cada fila local en cada servidor; la versión alimenta If-Match (ADR-0009).';

-- Nadie fuera del dueño de la base las lee ni las escribe: ni la API ni el navegador.
alter table private.fhir_outbox enable row level security;
alter table private.fhir_vinculos enable row level security;
revoke all on private.fhir_outbox, private.fhir_vinculos from public, anon, authenticated;
revoke all on sequence private.fhir_outbox_id_seq from public, anon, authenticated;

-- ── Seudónimo del paciente ──────────────────────────────────────────────────

create or replace function private.fhir_seudonimo(p_clave_local text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(extensions.hmac(convert_to(p_clave_local, 'UTF8'), convert_to(s.decrypted_secret, 'UTF8'), 'sha256'), 'hex')
    from vault.decrypted_secrets s
   where s.name = 'fhir_seudonimo_clave';
$$;

-- ── Datos mínimos para el mapeador (camelCase = tipos de mapeador.ts) ───────

create or replace function private.fhir_eps_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', e.id, 'nombre', e.name, 'nit', e.nit, 'activa', e.active,
                            'codigoHabilitacion', e.codigo_habilitacion)
    from public.eps e
   where e.id = p_id;
$$;

create or replace function private.fhir_sede_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', s.id, 'codigo', s.codigo_habilitacion_sede, 'nombre', s.nombre_sede,
                            'direccion', s.direccion,
                            'prestador', jsonb_build_object('nit', s.nit_prestador, 'nombre', s.nombre_prestador))
    from public.ips_sedes s
   where s.id = p_id;
$$;

create or replace function private.fhir_medico_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'id', d.id, 'nombre', d.full_name, 'registro', d.license_number, 'activo', d.active,
           'diasAtencion', to_jsonb(d.dias_atencion),
           'eps', private.fhir_eps_json(d.eps_id),
           'especialidad', jsonb_build_object('id', sp.id, 'nombre', sp.name),
           'sede', case when d.sede_id is null then null else private.fhir_sede_json(d.sede_id) end)
    from public.doctors d
    join public.specialties sp on sp.id = d.specialty_id
   where d.id = p_id;
$$;

create or replace function private.fhir_franja_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', s.id, 'fecha', to_char(s.date, 'YYYY-MM-DD'),
                            'inicio', to_char(s.start_time, 'HH24:MI:SS'), 'fin', to_char(s.end_time, 'HH24:MI:SS'),
                            'ocupada', s.is_booked or s.ocupado_otro_canal)
    from public.availability_slots s
   where s.id = p_id;
$$;

-- ── Funciones para la Edge Function fhir-sync (solo service_role) ───────────

-- Toma hasta p_limite eventos y los devuelve agrupados por cita, con el estado
-- ACTUAL de la cita (publicar siempre el último estado hace que el orden de los
-- eventos no importe y que repetir una publicación no cree nada nuevo).
create or replace function public.fhir_tomar_eventos(p_servidor text, p_limite integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eventos jsonb;
begin
  -- Eventos de citas que ya no existen (p. ej., por borrado de la cuenta): no hay nada que publicar.
  update private.fhir_outbox o
     set estado = 'fallido', ultimo_error = 'La cita ya no existe en CitasYA.', procesado_en = now(), bloqueado_hasta = null
   where o.estado in ('pendiente', 'procesando')
     and not exists (select 1 from public.appointments a where a.id = o.id_local);

  with tomados as (
    update private.fhir_outbox o
       set estado = 'procesando', bloqueado_hasta = now() + interval '2 minutes'
     where o.id in (
       select c.id
         from private.fhir_outbox c
        where c.estado in ('pendiente', 'procesando')
          and c.proximo_intento_en <= now()
          and (c.bloqueado_hasta is null or c.bloqueado_hasta < now())
        order by c.id
        limit greatest(1, least(coalesce(p_limite, 20), 100))
        for update skip locked)
    returning o.id, o.id_local, o.franja_anterior
  ), por_cita as (
    select t.id_local,
           array_agg(t.id order by t.id) as ids,
           coalesce(array_agg(distinct t.franja_anterior) filter (where t.franja_anterior is not null), '{}'::uuid[]) as anteriores
      from tomados t
     group by t.id_local
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'ids', to_jsonb(pc.ids),
           'cita', jsonb_build_object(
             'id', a.id,
             'estado', a.status,
             'modo', a.mode,
             'reservadaEn', a.booked_at,
             'medico', private.fhir_medico_json(a.doctor_id),
             'franja', private.fhir_franja_json(a.slot_id),
             'franjasAnteriores', coalesce((
               select jsonb_agg(private.fhir_franja_json(x))
                 from unnest(pc.anteriores) as x
                where x <> a.slot_id
                  and exists (select 1 from public.availability_slots s where s.id = x)), '[]'::jsonb),
             'paciente', jsonb_build_object('claveLocal', k.clave, 'seudonimo', private.fhir_seudonimo(k.clave))),
           'versiones', coalesce((
             select jsonb_object_agg(v.id_fhir, v.version)
               from private.fhir_vinculos v
              where v.servidor = p_servidor
                and v.recurso = 'Slot'
                and v.clave_local in (select 'availability_slots/' || y from unnest(pc.anteriores || a.slot_id) as y)), '{}'::jsonb)
         ) order by pc.ids[1]), '[]'::jsonb)
    into v_eventos
    from por_cita pc
    join public.appointments a on a.id = pc.id_local
    cross join lateral (
      select case when a.familiar_id is null then 'profiles/' || a.patient_id::text
                  else 'familiares/' || a.familiar_id::text end as clave
    ) k;

  return v_eventos;
end;
$$;

create or replace function public.fhir_guardar_vinculos(p_servidor text, p_vinculos jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  insert into private.fhir_vinculos (servidor, recurso, clave_local, id_fhir, version, actualizado_en)
  select distinct on (e.x->>'recurso', e.x->>'claveLocal')
         p_servidor, e.x->>'recurso', e.x->>'claveLocal', e.x->>'idFhir', e.x->>'version', now()
    from jsonb_array_elements(coalesce(p_vinculos, '[]'::jsonb)) with ordinality as e(x, n)
   where e.x->>'recurso' is not null and e.x->>'claveLocal' is not null
     and e.x->>'idFhir' is not null and e.x->>'version' is not null
   order by e.x->>'recurso', e.x->>'claveLocal', e.n desc
  on conflict (servidor, recurso, clave_local) do update
     set id_fhir = excluded.id_fhir, version = excluded.version, actualizado_en = now();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

create or replace function public.fhir_registrar_resultado(
  p_ids bigint[],
  p_servidor text,
  p_estado text,
  p_error text default null,
  p_vinculos jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_estado is null or p_estado not in ('publicado', 'pendiente', 'conflicto', 'fallido') then
    raise exception using errcode = 'P0001', message = 'ESTADO_INVALIDO', detail = coalesce(p_estado, 'nulo');
  end if;

  perform public.fhir_guardar_vinculos(p_servidor, p_vinculos);

  update private.fhir_outbox o
     set estado = case when p_estado = 'pendiente' and o.intentos + 1 >= 20 then 'fallido' else p_estado end,
         intentos = o.intentos + 1,
         -- Espera exponencial: 30 s, 1 min, 2 min, 4 min… hasta 1 hora entre intentos.
         proximo_intento_en = case when p_estado = 'pendiente'
                                   then now() + make_interval(secs => least(3600, 30 * power(2, least(o.intentos, 10))))
                                   else o.proximo_intento_en end,
         bloqueado_hasta = null,
         procesado_en = case when p_estado = 'pendiente' then null else now() end,
         servidor = p_servidor,
         ultimo_error = case when p_estado = 'publicado' then null else left(p_error, 1000) end
   where o.id = any (p_ids)
     and o.estado = 'procesando';
end;
$$;

-- Carga inicial: EPS, IPS (de las sedes), sedes y médicos activos.
create or replace function public.fhir_datos_maestros()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'eps', coalesce((select jsonb_agg(private.fhir_eps_json(e.id) order by e.name) from public.eps e), '[]'::jsonb),
    'sedes', coalesce((select jsonb_agg(private.fhir_sede_json(s.id) order by s.nombre_sede) from public.ips_sedes s), '[]'::jsonb),
    'medicos', coalesce((select jsonb_agg(private.fhir_medico_json(d.id) order by d.full_name)
                           from public.doctors d where d.active), '[]'::jsonb));
$$;

create or replace function public.fhir_validar_clave(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(length(p_clave), 0) >= 32
     and coalesce((select s.decrypted_secret = p_clave from vault.decrypted_secrets s where s.name = 'fhir_sync_clave'), false);
$$;

-- ── Panel de administración ─────────────────────────────────────────────────

create or replace function public.admin_fhir_resumen()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.es_admin()) then
    raise exception using errcode = 'P0001', message = 'NO_AUTORIZADO',
      detail = 'Solo un administrador puede ver el estado de la interoperabilidad.';
  end if;

  return jsonb_build_object(
    'estados', coalesce((
      select jsonb_object_agg(t.estado, t.n)
        from (select o.estado, count(*) as n from private.fhir_outbox o group by o.estado) t), '{}'::jsonb),
    'recursos', coalesce((
      select jsonb_object_agg(t.recurso, t.n)
        from (select v.recurso, count(*) as n from private.fhir_vinculos v group by v.recurso) t), '{}'::jsonb),
    'servidor', (
      select o.servidor from private.fhir_outbox o
       where o.servidor is not null order by o.procesado_en desc nulls last limit 1),
    'eventos', coalesce((
      select jsonb_agg(e.fila order by e.id desc)
        from (
          select o.id, jsonb_build_object(
                   'id', o.id, 'cita', o.id_local, 'estado', o.estado, 'intentos', o.intentos,
                   'creadoEn', o.creado_en, 'procesadoEn', o.procesado_en, 'error', o.ultimo_error,
                   'servidor', o.servidor,
                   'appointment', (
                     select jsonb_build_object('id', v.id_fhir, 'version', v.version)
                       from private.fhir_vinculos v
                      where v.servidor = o.servidor and v.recurso = 'Appointment'
                        and v.clave_local = 'appointments/' || o.id_local)) as fila
            from private.fhir_outbox o
           order by o.id desc
           limit 30) e), '[]'::jsonb));
end;
$$;

-- ── Disparadores: escribir el evento y despertar la sincronización ──────────

create or replace function private.fhir_encolar_cita()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.status is not distinct from old.status
     and new.slot_id is not distinct from old.slot_id
     and new.mode is not distinct from old.mode
     and new.familiar_id is not distinct from old.familiar_id then
    return null; -- p. ej., solo cambiaron las notas: nada de eso viaja a FHIR
  end if;
  insert into private.fhir_outbox (id_local, franja_anterior)
  values (new.id, case when tg_op = 'UPDATE' and new.slot_id is distinct from old.slot_id then old.slot_id end);
  return null;
end;
$$;

create trigger fhir_outbox_cita
  after insert or update on public.appointments
  for each row execute function private.fhir_encolar_cita();

-- Llama a fhir-sync con pg_net. La petición queda en la cola de pg_net dentro de
-- la misma transacción, así que solo sale si la transacción se confirma.
create or replace function private.fhir_despertar()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_jwt text;
  v_clave text;
begin
  select max(s.decrypted_secret) filter (where s.name = 'fhir_sync_url'),
         max(s.decrypted_secret) filter (where s.name = 'fhir_sync_jwt'),
         max(s.decrypted_secret) filter (where s.name = 'fhir_sync_clave')
    into v_url, v_jwt, v_clave
    from vault.decrypted_secrets s
   where s.name in ('fhir_sync_url', 'fhir_sync_jwt', 'fhir_sync_clave');
  if v_url is null or v_jwt is null or v_clave is null then
    return; -- sincronización sin configurar en este ambiente: los eventos esperan en la outbox
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('accion', 'sincronizar'),
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer ' || v_jwt,
                                  'x-citasya-fhir-clave', v_clave),
    timeout_milliseconds := 30000);
end;
$$;

create or replace function private.fhir_tras_encolar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.fhir_despertar();
  return null;
end;
$$;

create trigger fhir_outbox_despertar
  after insert on private.fhir_outbox
  for each statement execute function private.fhir_tras_encolar();

-- Respaldo: cada minuto, si quedan eventos por publicar (servidor caído, reintentos).
create or replace function private.fhir_despertar_si_hay_pendientes()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from private.fhir_outbox o
              where o.estado in ('pendiente', 'procesando')
                and o.proximo_intento_en <= now()
                and (o.bloqueado_hasta is null or o.bloqueado_hasta < now())) then
    perform private.fhir_despertar();
  end if;
end;
$$;

select cron.schedule('citasya-fhir-sync', '* * * * *', 'select private.fhir_despertar_si_hay_pendientes()');

-- Puesta en marcha (y cambio de servidor FHIR): publica una vez las citas futuras.
create or replace function private.fhir_encolar_citas_futuras()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  insert into private.fhir_outbox (id_local)
  select a.id
    from public.appointments a
    join public.availability_slots s on s.id = a.slot_id
   where private.inicio_horario(s.date, s.start_time) > now();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

select private.fhir_encolar_citas_futuras();

-- ── Permisos ────────────────────────────────────────────────────────────────

revoke all on function
  private.fhir_seudonimo(text), private.fhir_eps_json(uuid), private.fhir_sede_json(uuid),
  private.fhir_medico_json(uuid), private.fhir_franja_json(uuid), private.fhir_encolar_cita(),
  private.fhir_despertar(), private.fhir_tras_encolar(), private.fhir_despertar_si_hay_pendientes(),
  private.fhir_encolar_citas_futuras()
  from public, anon, authenticated;

revoke all on function
  public.fhir_tomar_eventos(text, integer), public.fhir_guardar_vinculos(text, jsonb),
  public.fhir_registrar_resultado(bigint[], text, text, text, jsonb), public.fhir_datos_maestros(),
  public.fhir_validar_clave(text)
  from public, anon, authenticated;
grant execute on function
  public.fhir_tomar_eventos(text, integer), public.fhir_guardar_vinculos(text, jsonb),
  public.fhir_registrar_resultado(bigint[], text, text, text, jsonb), public.fhir_datos_maestros(),
  public.fhir_validar_clave(text)
  to service_role;

revoke all on function public.admin_fhir_resumen() from public, anon;
grant execute on function public.admin_fhir_resumen() to authenticated;
