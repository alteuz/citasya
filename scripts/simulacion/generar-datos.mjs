// Genera la migración de datos de la simulación (ADR-0005) a partir de fuentes
// oficiales y de una semilla fija. Mismo resultado en cada ejecución.
//
// Entradas:
//   - Catálogo de EPS (MinSalud, "EPS vigentes del régimen contributivo y
//     subsidiado – SGSSS", 05-jun-2025) filtrado por las EPS habilitadas en
//     Bogotá (Decreto 0182 de 2026). Se define abajo, con su fuente.
//   - supabase/datos/reps-sedes-bogota.json (instantánea del REPS).
//   - Estándares de oportunidad de la Circular Externa 038 de 2025 (MGTE).
// Salida: supabase/migrations/<versión>_datos_simulacion.sql
//
// Uso: node scripts/simulacion/generar-datos.mjs <version>
import { readFile, writeFile } from 'node:fs/promises';

const VERSION = process.argv[2] ?? '20260927030000';
const SEMILLA = 20260926;

// ─── Fuentes ─────────────────────────────────────────────────────────────────
const FUENTE_EPS = 'MinSalud, EPS vigentes del régimen contributivo y subsidiado – SGSSS (05-jun-2025); habilitación en Bogotá: Decreto 0182 de 2026';
const FECHA_EPS = '2025-06-05';
const FUENTE_MGTE = 'Circular Externa 038 de 2025, MinSalud (MGTE, Fase I)';

// nombreActual: nombre con el que la EPS ya existe en la BD (se actualiza en vez de duplicarse).
const EPS = [
  { clave: 'aliansalud', nombre: 'Aliansalud EPS', codigo: 'EPS001', nit: '830113831', regimen: 'contributivo' },
  { clave: 'saludtotal', nombre: 'Salud Total EPS', codigo: 'EPS002', nit: '800130907', regimen: 'contributivo', nombreActual: 'Salud Total' },
  { clave: 'sanitas', nombre: 'EPS Sanitas', codigo: 'EPS005', nit: '800251440', regimen: 'contributivo', nombreActual: 'Sanitas' },
  { clave: 'compensar', nombre: 'Compensar EPS', codigo: 'EPS008', nit: '860066942', regimen: 'contributivo', nombreActual: 'Compensar' },
  { clave: 'sura', nombre: 'EPS Sura', codigo: 'EPS010', nit: '800088702', regimen: 'contributivo', nombreActual: 'Sura EPS' },
  { clave: 'famisanar', nombre: 'Famisanar EPS', codigo: 'EPS017', nit: '830003564', regimen: 'contributivo', nombreActual: 'Famisanar' },
  { clave: 'nuevaeps', nombre: 'Nueva EPS', codigo: 'EPS037', nit: '900156264', regimen: 'ambos', nombreActual: 'Nueva EPS' },
  { clave: 'capitalsalud', nombre: 'Capital Salud EPS-S', codigo: 'EPSS34', nit: '900298372', regimen: 'subsidiado' },
  { clave: 'mallamas', nombre: 'Mallamas EPSI', codigo: 'EPSI05', nit: '837000084', regimen: 'subsidiado' },
];

// Red EPS → prestador (NIT del REPS), con el tipo de relación y su soporte.
const RED = {
  capitalsalud: [
    ['900959048', 'red_publica_distrital'], ['900971006', 'red_publica_distrital'],
    ['900958564', 'red_publica_distrital'], ['900959051', 'red_publica_distrital'],
  ],
  sanitas: [['901041691', 'mismo_grupo']],
  compensar: [['860066942', 'misma_entidad']],
  sura: [['811007832', 'mismo_grupo']],
  saludtotal: [['800003765', 'mismo_grupo']],
  famisanar: [['860013570', 'asignada_simulacion']],
  nuevaeps: [['860007336', 'asignada_simulacion']],
  aliansalud: [['860007336', 'asignada_simulacion']],
  mallamas: [['900959048', 'asignada_simulacion']],
};
const SOPORTE = {
  misma_entidad: 'Mismo NIT de la EPS y de la IPS en el REPS',
  mismo_grupo: 'Grupo empresarial documentado públicamente por las entidades',
  red_publica_distrital: 'Subred Integrada de Servicios de Salud E.S.E. del Distrito Capital (red pública)',
  asignada_simulacion: 'Asignación hecha para la simulación; no se afirma una relación contractual real',
};
const SEDES_POR_PRESTADOR = { capitalsalud: 2, default: 3 };

// Excluye sedes que no prestan consulta externa general (ópticas, laboratorios…).
const EXCLUIR = /OPTICA|ÓPTICA|LABORATORIO|FARMACIA|DROGUER|VACUNA|IMAGEN|DIAGN|ODONTO|OFTALMO|SALUD MENTAL|RENAL|DIALISIS|UCI|URGENCIA/i;

const ESPECIALIDADES = [
  { nombre: 'Medicina General', mgte: 3, medicos: 3, dias: [1, 2, 3, 4, 5], duracion: 20 },
  { nombre: 'Pediatría', mgte: 5, medicos: 2, dias: [1, 2, 3, 4, 5], duracion: 20 },
  { nombre: 'Obstetricia', mgte: 8, medicos: 1, dias: [1, 3, 5], duracion: 30, nueva: true },
  { nombre: 'Ginecología', mgte: 10, medicos: 1, dias: [2, 4], duracion: 30 },
  { nombre: 'Psiquiatría', mgte: 10, medicos: 1, dias: [1, 3], duracion: 30, nueva: true },
  { nombre: 'Cirugía General', mgte: 10, medicos: 1, dias: [2, 5], duracion: 30, nueva: true },
  { nombre: 'Medicina Interna', mgte: 15, medicos: 1, dias: [1, 4], duracion: 30, nueva: true },
  { nombre: 'Cardiología', mgte: null, medicos: 1, dias: [3], duracion: 30 },
  { nombre: 'Dermatología', mgte: null, medicos: 1, dias: [2], duracion: 20 },
  { nombre: 'Oftalmología', mgte: null, medicos: 1, dias: [4], duracion: 20 },
  { nombre: 'Ortopedia', mgte: null, medicos: 1, dias: [5], duracion: 30 },
  { nombre: 'Psicología', mgte: null, medicos: 1, dias: [1, 2, 3, 4, 5], duracion: 40 },
];

// Nombres y apellidos frecuentes en Colombia, combinados al azar (semilla fija).
const NOMBRES_F = ['María', 'Luz', 'Carolina', 'Diana', 'Paola', 'Sandra', 'Adriana', 'Natalia', 'Andrea', 'Claudia', 'Juliana', 'Marcela', 'Ángela', 'Liliana', 'Catalina', 'Viviana'];
const NOMBRES_M = ['Juan', 'Carlos', 'Andrés', 'Jorge', 'Luis', 'Diego', 'Camilo', 'Felipe', 'Javier', 'Sergio', 'Mauricio', 'Óscar', 'Ricardo', 'Alejandro', 'Hernán', 'Fabián'];
const APELLIDOS = ['Rodríguez', 'Gómez', 'González', 'Martínez', 'García', 'López', 'Hernández', 'Sánchez', 'Ramírez', 'Pérez', 'Díaz', 'Moreno', 'Rojas', 'Vargas', 'Torres', 'Castro', 'Suárez', 'Jiménez', 'Ruiz', 'Ortiz', 'Parra', 'Cárdenas', 'Herrera', 'Medina'];

// ─── Utilidades deterministas ────────────────────────────────────────────────
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = mulberry32(SEMILLA);
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
const uuid = () => {
  const h = Array.from({ length: 32 }, () => Math.floor(azar() * 16).toString(16));
  h[12] = '4'; h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
};
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const capitalizar = (t) => t.toLowerCase().replace(/(^|[\s(.-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

// ─── Selección de sedes ──────────────────────────────────────────────────────
const reps = JSON.parse(await readFile('supabase/datos/reps-sedes-bogota.json', 'utf8'));
// Formato del REPS: "Fecha corte REPS: Mar 12 2026  3:11PM" → 2026-03-12
const MESES = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
const fechaReps = /(\w{3})\s+(\d{1,2})\s+(\d{4})/.exec(reps.fechaCorteReps);
if (!fechaReps || !MESES[fechaReps[1]]) throw new Error(`Fecha de corte REPS no reconocida: ${reps.fechaCorteReps}`);
const corte = `${fechaReps[3]}-${MESES[fechaReps[1]]}-${fechaReps[2].padStart(2, '0')}`;
const sedesPorNit = new Map();
for (const s of reps.sedes) {
  if (EXCLUIR.test(s.nombreSede)) continue;
  if (!sedesPorNit.has(s.nitPrestador)) sedesPorNit.set(s.nitPrestador, []);
  sedesPorNit.get(s.nitPrestador).push(s);
}

const sedesUsadas = new Map(); // codigo → { id, sede }
const red = []; // { eps, codigo, tipo }
for (const eps of EPS) {
  for (const [nit, tipo] of RED[eps.clave]) {
    const candidatas = sedesPorNit.get(nit) ?? [];
    const n = SEDES_POR_PRESTADOR[eps.clave] ?? SEDES_POR_PRESTADOR.default;
    // Mallamas y Aliansalud usan sedes distintas de las de su red "anfitriona".
    const desplazamiento = eps.clave === 'mallamas' || eps.clave === 'aliansalud' ? n : 0;
    for (const s of candidatas.slice(desplazamiento, desplazamiento + n)) {
      if (!sedesUsadas.has(s.codigoHabilitacionSede)) sedesUsadas.set(s.codigoHabilitacionSede, { id: uuid(), sede: s });
      red.push({ eps: eps.clave, codigo: s.codigoHabilitacionSede, tipo });
    }
  }
}

// ─── Médicos sintéticos ─────────────────────────────────────────────────────
const medicos = [];
let consecutivo = 1;
for (const eps of EPS) {
  const sedesEps = red.filter((r) => r.eps === eps.clave).map((r) => r.codigo);
  let turno = 0;
  for (const esp of ESPECIALIDADES) {
    for (let i = 0; i < esp.medicos; i++) {
      const mujer = azar() < 0.5;
      const nombre = `${mujer ? 'Dra.' : 'Dr.'} ${elegir(mujer ? NOMBRES_F : NOMBRES_M)} ${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`;
      medicos.push({
        id: uuid(),
        nombre,
        especialidad: esp.nombre,
        eps: eps.clave,
        sede: sedesEps[turno++ % sedesEps.length],
        registro: `SIM-${String(consecutivo++).padStart(5, '0')}`,
        dias: esp.dias,
        duracion: esp.duracion,
      });
    }
  }
}

// ─── SQL ─────────────────────────────────────────────────────────────────────
const sql = [];
sql.push(`-- ════════════════════════════════════════════════════════════════════════════
-- Datos de la simulación (ADR-0005). GENERADO por scripts/simulacion/generar-datos.mjs
-- con semilla ${SEMILLA}. No editar a mano: modificar el generador y regenerar.
-- EPS: ${FUENTE_EPS}
-- Sedes: ${reps.fuente} (${reps.fechaCorteReps})
-- Tiempos de espera: ${FUENTE_MGTE}
-- Médicos: SINTÉTICOS (nombres ficticios, registro con prefijo SIM-). Ley 1581/2012.
-- Resumen: ${EPS.length} EPS · ${sedesUsadas.size} sedes · ${red.length} vínculos de red · ${medicos.length} médicos
-- ════════════════════════════════════════════════════════════════════════════
`);

sql.push('-- ─── EPS habilitadas en Bogotá ───');
for (const e of EPS) {
  if (e.nombreActual) {
    sql.push(`update public.eps set name = ${q(e.nombre)}, nit = ${q(e.nit)}, codigo_habilitacion = ${q(e.codigo)}, regimen = ${q(e.regimen)}, fuente = ${q(FUENTE_EPS)}, fecha_corte = ${q(FECHA_EPS)}, active = true where name = ${q(e.nombreActual)};`);
  } else {
    sql.push(`insert into public.eps (name, nit, codigo_habilitacion, regimen, fuente, fecha_corte, active) values (${q(e.nombre)}, ${q(e.nit)}, ${q(e.codigo)}, ${q(e.regimen)}, ${q(FUENTE_EPS)}, ${q(FECHA_EPS)}, true) on conflict (nit) do update set name = excluded.name, codigo_habilitacion = excluded.codigo_habilitacion, regimen = excluded.regimen, fuente = excluded.fuente, fecha_corte = excluded.fecha_corte, active = true;`);
  }
}
sql.push(`-- EPS del MVP que ya no operan: se conservan inactivas (hay citas históricas que las referencian).
update public.eps set name = 'Medimás EPS (liquidada)', nit = '901097473', active = false, fuente = 'Dato del MVP; entidad liquidada. NIT corregido: 900914254 corresponde a Salud Mía según MinSalud' where name = 'Medimás';
update public.eps set name = 'Coomeva EPS (liquidada)', active = false, fuente = 'Dato del MVP; entidad liquidada' where name = 'Coomeva EPS';
`);

sql.push('-- ─── Especialidades y estándar MGTE ───');
for (const e of ESPECIALIDADES) {
  const mgte = e.mgte === null ? 'null' : e.mgte;
  const fuente = e.mgte === null ? q('Sin estándar en la Circular 038 de 2025; la simulación usa 20 días como parámetro declarado') : q(FUENTE_MGTE);
  if (e.nueva) {
    sql.push(`insert into public.specialties (name, description, dias_max_mgte, fuente_mgte) values (${q(e.nombre)}, '', ${mgte}, ${fuente}) on conflict (name) do update set dias_max_mgte = excluded.dias_max_mgte, fuente_mgte = excluded.fuente_mgte;`);
  } else {
    sql.push(`update public.specialties set dias_max_mgte = ${mgte}, fuente_mgte = ${fuente} where name = ${q(e.nombre)};`);
  }
}

const nitDe = (clave) => EPS.find((e) => e.clave === clave).nit;

sql.push('\n-- ─── Sedes reales de IPS (REPS) ───');
sql.push(`insert into public.ips_sedes (id, codigo_habilitacion_sede, nit_prestador, nombre_prestador, nombre_sede, direccion, telefono, naturaleza_juridica, es_ese, fuente, fecha_corte) values\n${
  [...sedesUsadas.values()].map(({ id, sede }) =>
    `  (${q(id)}, ${q(sede.codigoHabilitacionSede)}, ${q(sede.nitPrestador)}, ${q(capitalizar(sede.nombrePrestador))}, ${q(sede.nombreSede)}, ${q(sede.direccion)}, ${q(sede.telefono)}, ${q(sede.naturalezaJuridica)}, ${sede.esEse}, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', ${q(corte)})`,
  ).join(',\n')
}\non conflict (codigo_habilitacion_sede) do nothing;`);

sql.push('\n-- ─── Red EPS → sede ───');
sql.push(`insert into public.eps_red_sedes (eps_id, sede_id, tipo_relacion, soporte)
select e.id, s.id, v.tipo, v.soporte
from (values\n${red.map((r) => `  (${q(nitDe(r.eps))}, ${q(r.codigo)}, ${q(r.tipo)}, ${q(SOPORTE[r.tipo])})`).join(',\n')}
) as v(nit, codigo, tipo, soporte)
join public.eps e on e.nit = v.nit
join public.ips_sedes s on s.codigo_habilitacion_sede = v.codigo
on conflict do nothing;`);

sql.push(`
-- ─── Médicos del MVP: se desactivan (inventados) y se eliminan sus horarios sin citas ───
update public.doctors set active = false where license_number not like 'SIM-%';
delete from public.availability_slots s
 where s.doctor_id in (select id from public.doctors where license_number not like 'SIM-%')
   and not exists (select 1 from public.appointments a where a.slot_id = s.id);
`);

sql.push('-- ─── Médicos sintéticos de la simulación ───');
sql.push(`insert into public.doctors (id, full_name, specialty_id, eps_id, license_number, sede_id, sintetico, dias_atencion, duracion_cita_min, active)
select v.id::uuid, v.nombre, sp.id, e.id, v.registro, s.id, true, v.dias::smallint[], v.duracion, true
from (values\n${medicos.map((m) => `  (${q(m.id)}, ${q(m.nombre)}, ${q(m.especialidad)}, ${q(nitDe(m.eps))}, ${q(m.registro)}, ${q(m.sede)}, '{${m.dias.join(',')}}', ${m.duracion})`).join(',\n')}
) as v(id, nombre, especialidad, nit, registro, sede, dias, duracion)
join public.specialties sp on sp.name = v.especialidad
join public.eps e on e.nit = v.nit
join public.ips_sedes s on s.codigo_habilitacion_sede = v.sede
on conflict (license_number) do nothing;`);

const archivo = `supabase/migrations/${VERSION}_datos_simulacion.sql`;
await writeFile(archivo, sql.join('\n') + '\n');
console.log(`${archivo}: ${EPS.length} EPS, ${sedesUsadas.size} sedes, ${red.length} vínculos, ${medicos.length} médicos`);
