-- ════════════════════════════════════════════════════════════════════════════
-- Modelo de datos de la simulación (ADR-0005)
-- Principio: todo lo institucional es real y citable; ninguna persona es real.
-- Cada registro institucional guarda su procedencia (fuente y fecha de corte).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── EPS: identificación oficial y procedencia ──────────────────────────────
alter table public.eps
  add column if not exists codigo_habilitacion text,
  add column if not exists regimen text,
  add column if not exists fuente text not null default 'Dato de prueba del MVP (sin fuente)',
  add column if not exists fecha_corte date;

alter table public.eps
  add constraint eps_regimen_valido check (regimen is null or regimen in ('contributivo', 'subsidiado', 'ambos'));

comment on column public.eps.codigo_habilitacion is 'Código de la EPS en el SGSSS (MinSalud), p. ej. EPS037.';

-- ─── Sedes de IPS (REPS) ────────────────────────────────────────────────────
create table if not exists public.ips_sedes (
  id uuid primary key default gen_random_uuid(),
  codigo_habilitacion_sede text not null unique,
  nit_prestador text not null,
  nombre_prestador text not null,
  nombre_sede text not null,
  direccion text not null default '',
  telefono text not null default '',
  naturaleza_juridica text not null,
  es_ese boolean not null default false,
  fuente text not null,
  fecha_corte date not null,
  created_at timestamptz not null default now()
);
comment on table public.ips_sedes is
  'Sedes reales de IPS en Bogotá tomadas del REPS (MinSalud, datos.gov.co c36g-9fc2). Solo instituciones (NIT).';

-- ─── Red EPS → sede, con el tipo de relación declarado ──────────────────────
create table if not exists public.eps_red_sedes (
  eps_id uuid not null references public.eps(id) on delete cascade,
  sede_id uuid not null references public.ips_sedes(id) on delete cascade,
  tipo_relacion text not null check (tipo_relacion in ('misma_entidad', 'mismo_grupo', 'red_publica_distrital', 'asignada_simulacion')),
  soporte text not null,
  primary key (eps_id, sede_id)
);
create index if not exists idx_eps_red_sedes_sede on public.eps_red_sedes (sede_id);
comment on column public.eps_red_sedes.tipo_relacion is
  'misma_entidad: igual NIT; mismo_grupo: grupo empresarial documentado; red_publica_distrital: red pública del Distrito; asignada_simulacion: asignación hecha para la simulación, sin relación real afirmada.';

-- ─── Especialidades: estándar de oportunidad MGTE ───────────────────────────
alter table public.specialties
  add column if not exists dias_max_mgte integer,
  add column if not exists fuente_mgte text;
comment on column public.specialties.dias_max_mgte is
  'Días máximos para asignar la cita según la Circular Externa 038 de 2025 (MinSalud, MGTE Fase I). Nulo si la circular no fija estándar.';

-- ─── Médicos: sede, agenda y marca de dato sintético ────────────────────────
alter table public.doctors
  add column if not exists sede_id uuid references public.ips_sedes(id) on delete set null,
  add column if not exists sintetico boolean not null default true,
  add column if not exists dias_atencion smallint[] not null default '{1,2,3,4,5}',
  add column if not exists duracion_cita_min smallint not null default 20;
create index if not exists idx_doctors_sede on public.doctors (sede_id);
comment on column public.doctors.sintetico is
  'Verdadero para médicos generados para la simulación (nombres y registros ficticios, prefijo SIM-). Ley 1581/2012.';
comment on column public.doctors.dias_atencion is 'Días de atención ISO (1 = lunes … 7 = domingo).';

-- ─── Horarios: ocupación por otros canales de la EPS ────────────────────────
-- CitasYA es un canal más de agendamiento. Los horarios que la simulación
-- marca como ocupados representan citas asignadas por otros canales (línea
-- telefónica, sede, app de la EPS), no citas de pacientes de CitasYA.
alter table public.availability_slots
  add column if not exists ocupado_otro_canal boolean not null default false;

-- ─── Seguridad de las tablas nuevas ─────────────────────────────────────────
alter table public.ips_sedes enable row level security;
alter table public.eps_red_sedes enable row level security;

create policy sedes_lectura on public.ips_sedes for select using (true);
create policy red_lectura on public.eps_red_sedes for select using (true);

revoke insert, update, delete, truncate on public.ips_sedes, public.eps_red_sedes from anon, authenticated;
grant select on public.ips_sedes, public.eps_red_sedes to anon, authenticated;
