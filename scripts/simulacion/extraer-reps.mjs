// Extrae del REPS (datos abiertos de MinSalud) las sedes de IPS en Bogotá de
// las redes usadas en la simulación y guarda una instantánea versionada.
//
// Fuente: "Registro Especial de Prestadores y Sedes de Servicios de Salud",
// datos.gov.co, conjunto c36g-9fc2 (MinSalud).
// Uso:    node scripts/simulacion/extraer-reps.mjs
// Salida: supabase/datos/reps-sedes-bogota.json
//
// Privacidad (Ley 1581/2012): solo se consultan INSTITUCIONES (tipo de
// identificación NI = NIT). Se excluyen profesionales independientes, cuyos
// registros contienen cédula y datos de contacto personales. Tampoco se
// guardan correos electrónicos.
import { writeFile, mkdir } from 'node:fs/promises';

const ENDPOINT = 'https://www.datos.gov.co/resource/c36g-9fc2.json';

// NIT de los prestadores (verificados en el REPS) cuyas sedes se incluyen.
export const PRESTADORES = {
  '900959048': 'Subred Integrada de Servicios de Salud Sur Occidente E.S.E',
  '900971006': 'Subred Integrada de Servicios de Salud Norte E.S.E',
  '900958564': 'Subred Integrada de Servicios de Salud Sur E.S.E',
  '900959051': 'Subred Integrada de Servicios de Salud Centro Oriente E.S.E',
  '901041691': 'Centros Médicos Colsanitas S.A.S',
  '860066942': 'Caja de Compensación Familiar Compensar',
  '811007832': 'Servicios de Salud IPS Suramericana S.A.S',
  '800003765': 'Virrey Solís IPS S.A.',
  '860013570': 'Caja de Compensación Familiar Cafam',
  '860007336': 'Caja Colombiana de Subsidio Familiar Colsubsidio',
};

const CAMPOS = [
  'codigoprestador', 'nombreprestador', 'numeroidentificacion', 'codigohabilitacionsede',
  'nombresede', 'direcci_nsede', 't_lefonosede', 'naturalezajuridica', 'ese', 'fecha_corte_reps',
];

const nits = Object.keys(PRESTADORES).map((n) => `'${n}'`).join(',');
const params = new URLSearchParams({
  $select: CAMPOS.join(','),
  $where: [
    "municipiosede='11001'",
    "claseprestador='Instituciones Prestadoras de Servicios de Salud - IPS'",
    "tipoid='NI'",
    `numeroidentificacion in (${nits})`,
  ].join(' AND '),
  $order: 'numeroidentificacion, codigohabilitacionsede',
  $limit: '5000',
});

const respuesta = await fetch(`${ENDPOINT}?${params}`);
if (!respuesta.ok) throw new Error(`REPS respondió ${respuesta.status}`);
const filas = await respuesta.json();

const sedes = filas.map((f) => ({
  codigoHabilitacionSede: f.codigohabilitacionsede,
  codigoPrestador: f.codigoprestador,
  nitPrestador: f.numeroidentificacion,
  nombrePrestador: f.nombreprestador,
  nombreSede: f.nombresede,
  direccion: f.direcci_nsede ?? '',
  telefono: f.t_lefonosede ?? '',
  naturalezaJuridica: f.naturalezajuridica,
  esEse: f.ese === 'SI',
}));

const corte = filas[0]?.fecha_corte_reps ?? 'desconocida';
const instantanea = {
  fuente: 'MinSalud — Registro Especial de Prestadores y Sedes de Servicios de Salud (REPS), datos.gov.co c36g-9fc2',
  consulta: `${ENDPOINT}?${params}`,
  fechaCorteReps: corte,
  fechaExtraccion: new Date().toISOString(),
  totalSedes: sedes.length,
  sedes,
};

await mkdir('supabase/datos', { recursive: true });
await writeFile('supabase/datos/reps-sedes-bogota.json', JSON.stringify(instantanea, null, 2) + '\n');
console.log(`${sedes.length} sedes guardadas · ${corte}`);
