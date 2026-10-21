/**
 * FhirMapper — transforma los datos de CitasYA en recursos HL7 FHIR R4 (ADR-0009).
 *
 * Son funciones puras: la misma entrada produce siempre la misma salida, no
 * leen la hora del sistema y no hacen red. Las fechas llegan de la base como
 * fecha y hora locales de Bogotá y salen como `instant` con zona −05:00
 * (Colombia no tiene horario de verano).
 *
 * Privacidad (Ley 1581 de 2012): el paciente llega seudonimizado desde la base
 * (HMAC-SHA-256 con una clave que nunca sale de ella). El mapeador nunca recibe
 * nombre, documento, contacto, fecha de nacimiento, notas ni el motivo escrito
 * de una cancelación, así que no puede enviarlos aunque se equivoque.
 */
import type {
  Appointment, Bundle, BundleEntry, CodeableConcept, DiaSemana, EstadoAppointment,
  Location, Organization, Patient, Practitioner, PractitionerRole, RecursoClinico,
  Schedule, Slot, TipoRecurso,
} from './tipos.ts';

// ─── Datos de entrada (los arma la base de datos) ───────────────────────────

export interface EpsFuente {
  readonly id: string;
  readonly nombre: string;
  readonly nit: string;
  readonly activa: boolean;
  readonly codigoHabilitacion: string | null;
}

export interface PrestadorFuente {
  readonly nit: string;
  readonly nombre: string;
}

export interface SedeFuente {
  readonly id: string;
  /** Código de habilitación de la sede en el REPS. */
  readonly codigo: string;
  readonly nombre: string;
  readonly direccion: string;
  readonly prestador: PrestadorFuente;
}

export interface EspecialidadFuente {
  readonly id: string;
  readonly nombre: string;
}

export interface MedicoFuente {
  readonly id: string;
  readonly nombre: string;
  readonly registro: string;
  readonly activo: boolean;
  /** Días ISO: 1 = lunes … 7 = domingo. */
  readonly diasAtencion: readonly number[];
  readonly eps: EpsFuente;
  readonly especialidad: EspecialidadFuente;
  readonly sede: SedeFuente | null;
}

export interface FranjaFuente {
  readonly id: string;
  /** AAAA-MM-DD, hora local de Bogotá. */
  readonly fecha: string;
  /** HH:MM:SS */
  readonly inicio: string;
  /** HH:MM:SS */
  readonly fin: string;
  /** Reservada en CitasYA u ocupada por otro canal. */
  readonly ocupada: boolean;
}

export interface PacienteFuente {
  /** `profiles/<uuid>` o `familiares/<uuid>`: solo se usa dentro de CitasYA. */
  readonly claveLocal: string;
  /** HMAC-SHA-256 en hexadecimal (64 caracteres). */
  readonly seudonimo: string;
}

export type EstadoCitaLocal = 'scheduled' | 'rescheduled' | 'cancelled' | 'completed';
export type ModalidadCita = 'presencial' | 'telemedicina';

export interface CitaFuente {
  readonly id: string;
  readonly estado: EstadoCitaLocal;
  readonly modo: ModalidadCita;
  /** Momento de la reserva (ISO 8601 con zona). */
  readonly reservadaEn: string;
  readonly medico: MedicoFuente;
  readonly franja: FranjaFuente;
  /** Franjas que la cita dejó al reprogramarse; deben quedar libres en el servidor. */
  readonly franjasAnteriores: readonly FranjaFuente[];
  readonly paciente: PacienteFuente;
}

export interface DatosMaestros {
  readonly eps: readonly EpsFuente[];
  readonly sedes: readonly SedeFuente[];
  readonly medicos: readonly MedicoFuente[];
}

// ─── Sistemas de identificadores y de códigos ───────────────────────────────

/**
 * Espacio de nombres propio. Se reemplazará por los NamingSystem de la guía
 * nacional del RDA cuando se adopten sus perfiles (sección 4.4.1).
 */
export const ESPACIO_CITASYA = 'https://citasya-seven.vercel.app/fhir';

export const SISTEMAS = {
  nit: `${ESPACIO_CITASYA}/sid/nit`,
  codigoEps: `${ESPACIO_CITASYA}/sid/codigo-eps`,
  sedeReps: `${ESPACIO_CITASYA}/sid/codigo-habilitacion-sede`,
  registroMedico: `${ESPACIO_CITASYA}/sid/registro-medico`,
  seudonimo: `${ESPACIO_CITASYA}/sid/paciente-seudonimo`,
  cita: `${ESPACIO_CITASYA}/sid/cita`,
  especialidad: `${ESPACIO_CITASYA}/CodeSystem/especialidad`,
  modalidad: `${ESPACIO_CITASYA}/CodeSystem/modalidad`,
  tipoOrganizacion: 'http://terminology.hl7.org/CodeSystem/organization-type',
  motivoCancelacion: 'http://terminology.hl7.org/CodeSystem/appointment-cancellation-reason',
  seguridad: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue',
} as const;

// ─── Identificadores lógicos y claves locales ───────────────────────────────

const PATRON_ID_FHIR = /^[A-Za-z0-9\-.]{1,64}$/;

function idValido(id: string): string {
  if (!PATRON_ID_FHIR.test(id)) {
    throw new Error(`Identificador FHIR inválido: «${id}» (se permiten letras, números, «-» y «.», hasta 64).`);
  }
  return id;
}

/**
 * Ids asignados por CitasYA (PUT con id). El prefijo evita choques en un
 * servidor compartido y la parte variable es el uuid de la fila, de modo que
 * publicar dos veces la misma fila actualiza el mismo recurso.
 */
export const idFhir = {
  eps: (id: string) => idValido(`citasya-eps-${id}`),
  prestador: (nit: string) => idValido(`citasya-ips-${nit}`),
  sede: (id: string) => idValido(`citasya-sede-${id}`),
  medico: (id: string) => idValido(`citasya-medico-${id}`),
  rol: (id: string) => idValido(`citasya-rol-${id}`),
  agenda: (id: string) => idValido(`citasya-agenda-${id}`),
  franja: (id: string) => idValido(`citasya-franja-${id}`),
  cita: (id: string) => idValido(`citasya-cita-${id}`),
} as const;

/** Clave de cada fila local en `fhir_vinculos` (tabla/id). */
export const claveLocal = {
  eps: (id: string) => `eps/${id}`,
  prestador: (nit: string) => `ips/${nit}`,
  sede: (id: string) => `ips_sedes/${id}`,
  medico: (id: string) => `doctors/${id}`,
  franja: (id: string) => `availability_slots/${id}`,
  cita: (id: string) => `appointments/${id}`,
} as const;

// ─── Fechas (zona de Bogotá) ────────────────────────────────────────────────

export const ZONA_BOGOTA = '-05:00';
/** Ventana de la agenda simulada (ADR-0005). */
export const HORIZONTE_AGENDA_DIAS = 60;

/** `instant` FHIR a partir de una fecha y una hora locales de Bogotá. */
export function instanteBogota(fecha: string, hora: string): string {
  const horaCompleta = /^\d{2}:\d{2}$/.test(hora) ? `${hora}:00` : hora.slice(0, 8);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}:\d{2}$/.test(horaCompleta)) {
    throw new Error(`Fecha u hora inválida: «${fecha} ${hora}».`);
  }
  return `${fecha}T${horaCompleta}${ZONA_BOGOTA}`;
}

/** Suma días a una fecha AAAA-MM-DD sin depender de la zona del equipo. */
export function sumarDias(fecha: string, dias: number): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!partes) throw new Error(`Fecha inválida: «${fecha}».`);
  const instante = Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]) + dias);
  return new Date(instante).toISOString().slice(0, 10);
}

function minutosDelDia(hora: string): number {
  const partes = /^(\d{2}):(\d{2})/.exec(hora);
  if (!partes) throw new Error(`Hora inválida: «${hora}».`);
  return Number(partes[1]) * 60 + Number(partes[2]);
}

// ─── Códigos ────────────────────────────────────────────────────────────────

/** Código estable de una especialidad: su nombre sin tildes, en minúsculas y con guiones. */
export function codigoEspecialidad(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function conceptoEspecialidad(especialidad: EspecialidadFuente): CodeableConcept {
  return {
    coding: [{ system: SISTEMAS.especialidad, code: codigoEspecialidad(especialidad.nombre), display: especialidad.nombre }],
    text: especialidad.nombre,
  };
}

const DIAS_FHIR: Readonly<Record<number, DiaSemana>> = {
  1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 7: 'sun',
};

const ESTADO_FHIR: Readonly<Record<EstadoCitaLocal, EstadoAppointment>> = {
  scheduled: 'booked',
  rescheduled: 'booked',
  cancelled: 'cancelled',
  completed: 'fulfilled',
};

const MODALIDAD: Readonly<Record<ModalidadCita, string>> = {
  presencial: 'Presencial',
  telemedicina: 'Telemedicina',
};

// ─── Recursos maestros ──────────────────────────────────────────────────────

export function organizacionEps(eps: EpsFuente): Organization {
  return {
    resourceType: 'Organization',
    id: idFhir.eps(eps.id),
    identifier: [
      { use: 'official', system: SISTEMAS.nit, value: eps.nit },
      ...(eps.codigoHabilitacion ? [{ system: SISTEMAS.codigoEps, value: eps.codigoHabilitacion }] : []),
    ],
    active: eps.activa,
    type: [{
      coding: [{ system: SISTEMAS.tipoOrganizacion, code: 'pay', display: 'Payer' }],
      text: 'Entidad promotora de salud (EPS)',
    }],
    name: eps.nombre,
  };
}

export function organizacionIps(prestador: PrestadorFuente): Organization {
  return {
    resourceType: 'Organization',
    id: idFhir.prestador(prestador.nit),
    identifier: [{ use: 'official', system: SISTEMAS.nit, value: prestador.nit }],
    active: true,
    type: [{
      coding: [{ system: SISTEMAS.tipoOrganizacion, code: 'prov', display: 'Healthcare Provider' }],
      text: 'Institución prestadora de servicios de salud (IPS)',
    }],
    name: prestador.nombre,
  };
}

export function ubicacion(sede: SedeFuente): Location {
  return {
    resourceType: 'Location',
    id: idFhir.sede(sede.id),
    identifier: [{ use: 'official', system: SISTEMAS.sedeReps, value: sede.codigo }],
    status: 'active',
    name: sede.nombre,
    mode: 'instance',
    address: { text: sede.direccion, city: 'Bogotá D.C.', country: 'CO' },
    managingOrganization: {
      reference: `Organization/${idFhir.prestador(sede.prestador.nit)}`,
      display: sede.prestador.nombre,
    },
  };
}

export function profesional(medico: MedicoFuente): Practitioner {
  return {
    resourceType: 'Practitioner',
    id: idFhir.medico(medico.id),
    identifier: [{ use: 'official', system: SISTEMAS.registroMedico, value: medico.registro }],
    active: medico.activo,
    name: [{ text: medico.nombre }],
  };
}

export function rolProfesional(medico: MedicoFuente): PractitionerRole {
  const dias = [...new Set(medico.diasAtencion)]
    .sort((a, b) => a - b)
    .map((dia) => DIAS_FHIR[dia])
    .filter((dia): dia is DiaSemana => dia !== undefined);
  return {
    resourceType: 'PractitionerRole',
    id: idFhir.rol(medico.id),
    active: medico.activo,
    practitioner: { reference: `Practitioner/${idFhir.medico(medico.id)}`, display: medico.nombre },
    organization: { reference: `Organization/${idFhir.eps(medico.eps.id)}`, display: medico.eps.nombre },
    specialty: [conceptoEspecialidad(medico.especialidad)],
    ...(medico.sede
      ? { location: [{ reference: `Location/${idFhir.sede(medico.sede.id)}`, display: medico.sede.nombre }] }
      : {}),
    ...(dias.length > 0 ? { availableTime: [{ daysOfWeek: dias }] } : {}),
  };
}

/** Agenda del médico; `hoy` (AAAA-MM-DD, Bogotá) fija el horizonte de 60 días. */
export function agenda(medico: MedicoFuente, hoy: string): Schedule {
  return {
    resourceType: 'Schedule',
    id: idFhir.agenda(medico.id),
    active: medico.activo,
    serviceType: [conceptoEspecialidad(medico.especialidad)],
    actor: [
      { reference: `PractitionerRole/${idFhir.rol(medico.id)}`, display: medico.nombre },
      ...(medico.sede ? [{ reference: `Location/${idFhir.sede(medico.sede.id)}`, display: medico.sede.nombre }] : []),
    ],
    planningHorizon: {
      start: instanteBogota(hoy, '00:00:00'),
      end: instanteBogota(sumarDias(hoy, HORIZONTE_AGENDA_DIAS), '23:59:59'),
    },
  };
}

export function franja(datos: FranjaFuente, medico: MedicoFuente): Slot {
  return {
    resourceType: 'Slot',
    id: idFhir.franja(datos.id),
    serviceType: [conceptoEspecialidad(medico.especialidad)],
    schedule: { reference: `Schedule/${idFhir.agenda(medico.id)}` },
    status: datos.ocupada ? 'busy' : 'free',
    start: instanteBogota(datos.fecha, datos.inicio),
    end: instanteBogota(datos.fecha, datos.fin),
  };
}

// ─── Paciente seudonimizado y cita ──────────────────────────────────────────

const PATRON_SEUDONIMO = /^[0-9a-f]{64}$/;

function seudonimoValido(seudonimo: string): string {
  if (!PATRON_SEUDONIMO.test(seudonimo)) {
    throw new Error('El seudónimo del paciente debe ser un HMAC-SHA-256 en hexadecimal (64 caracteres).');
  }
  return seudonimo;
}

/** Paciente sin datos personales: solo el seudónimo y la etiqueta de seguridad PSEUDED. */
export function paciente(datos: PacienteFuente): Patient {
  return {
    resourceType: 'Patient',
    meta: { security: [{ system: SISTEMAS.seguridad, code: 'PSEUDED', display: 'pseudonymized' }] },
    identifier: [{ use: 'secondary', system: SISTEMAS.seudonimo, value: seudonimoValido(datos.seudonimo) }],
    active: true,
  };
}

/** URL de la actualización condicional: un solo Patient por seudónimo (TC-04). */
export function urlCondicionalPaciente(seudonimo: string): string {
  return `Patient?identifier=${SISTEMAS.seudonimo}|${seudonimoValido(seudonimo)}`;
}

/** `urn:uuid` estable del paciente dentro de un Bundle (deriva del seudónimo). */
export function urnPaciente(seudonimo: string): string {
  const h = seudonimoValido(seudonimo);
  return `urn:uuid:${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** Cita; `referenciaPaciente` es `Patient/<id>` o el `urn:uuid` del paciente en el mismo Bundle. */
export function cita(datos: CitaFuente, referenciaPaciente: string): Appointment {
  const estado = ESTADO_FHIR[datos.estado];
  const { medico, franja: horario } = datos;
  return {
    resourceType: 'Appointment',
    id: idFhir.cita(datos.id),
    identifier: [{ use: 'official', system: SISTEMAS.cita, value: datos.id }],
    status: estado,
    // El motivo escrito por el paciente no se envía (puede contener datos de salud):
    // se informa con el código estándar de cancelación desde el portal del paciente.
    ...(estado === 'cancelled'
      ? {
          cancelationReason: {
            coding: [{ system: SISTEMAS.motivoCancelacion, code: 'pat-cpp', display: 'Patient: Canceled via Patient Portal' }],
            text: 'Cancelada por el paciente en CitasYA',
          },
        }
      : {}),
    serviceType: [conceptoEspecialidad(medico.especialidad)],
    appointmentType: {
      coding: [{ system: SISTEMAS.modalidad, code: datos.modo, display: MODALIDAD[datos.modo] }],
      text: MODALIDAD[datos.modo],
    },
    start: instanteBogota(horario.fecha, horario.inicio),
    end: instanteBogota(horario.fecha, horario.fin),
    minutesDuration: minutosDelDia(horario.fin) - minutosDelDia(horario.inicio),
    slot: [{ reference: `Slot/${idFhir.franja(horario.id)}` }],
    created: datos.reservadaEn,
    participant: [
      { actor: { reference: referenciaPaciente }, status: 'accepted' },
      { actor: { reference: `PractitionerRole/${idFhir.rol(medico.id)}`, display: medico.nombre }, status: 'accepted' },
      ...(medico.sede
        ? [{ actor: { reference: `Location/${idFhir.sede(medico.sede.id)}`, display: medico.sede.nombre }, status: 'accepted' as const }]
        : []),
    ],
  };
}

// ─── Bundles de transacción ─────────────────────────────────────────────────

/** Versión de cada franja ya publicada (id FHIR → versionId), leída de `fhir_vinculos`. */
export type Versiones = Readonly<Record<string, string>>;

/** Qué fila local representa cada entrada del Bundle (mismo orden que `entry`). */
export interface EntradaEsperada {
  readonly recurso: TipoRecurso;
  readonly claveLocal: string;
}

export interface BundlePreparado {
  readonly bundle: Bundle;
  readonly esperadas: readonly EntradaEsperada[];
}

type Par = readonly [BundleEntry, EntradaEsperada];

export const etiquetaVersion = (version: string): string => `W/"${version}"`;

function put(recurso: RecursoClinico & { readonly id: string }, clave: string, ifMatch?: string): Par {
  return [
    {
      resource: recurso,
      request: { method: 'PUT', url: `${recurso.resourceType}/${recurso.id}`, ...(ifMatch ? { ifMatch } : {}) },
    },
    { recurso: recurso.resourceType, claveLocal: clave },
  ];
}

function maestrosDelMedico(medico: MedicoFuente, hoy: string): Par[] {
  const pares: Par[] = [put({ ...organizacionEps(medico.eps), id: idFhir.eps(medico.eps.id) }, claveLocal.eps(medico.eps.id))];
  if (medico.sede) {
    const { sede } = medico;
    pares.push(
      put({ ...organizacionIps(sede.prestador), id: idFhir.prestador(sede.prestador.nit) }, claveLocal.prestador(sede.prestador.nit)),
      put({ ...ubicacion(sede), id: idFhir.sede(sede.id) }, claveLocal.sede(sede.id)),
    );
  }
  pares.push(
    put({ ...profesional(medico), id: idFhir.medico(medico.id) }, claveLocal.medico(medico.id)),
    put({ ...rolProfesional(medico), id: idFhir.rol(medico.id) }, claveLocal.medico(medico.id)),
    put({ ...agenda(medico, hoy), id: idFhir.agenda(medico.id) }, claveLocal.medico(medico.id)),
  );
  return pares;
}

function armar(pares: readonly Par[]): BundlePreparado {
  return {
    bundle: { resourceType: 'Bundle', type: 'transaction', entry: pares.map(([entrada]) => entrada) },
    esperadas: pares.map(([, esperada]) => esperada),
  };
}

/**
 * Bundle de una cita (TC-06, TC-08, TC-09). Incluye, en orden de dependencias:
 * los maestros del médico (idempotentes: si no cambiaron, el servidor no crea
 * versión), las franjas anteriores y la actual —con `If-Match` cuando ya se
 * publicaron—, el paciente por actualización condicional y la cita. Así el
 * Bundle es autosuficiente aunque el servidor haya perdido sus datos.
 *
 * `omitirFranjas` (ids locales) deja fuera las franjas que, tras un conflicto
 * de versión, resultaron tomadas por otra cita del servidor.
 */
export function bundleCita(
  datos: CitaFuente,
  opciones: { readonly hoy: string; readonly versiones: Versiones; readonly omitirFranjas?: ReadonlySet<string> },
): BundlePreparado {
  const pares = maestrosDelMedico(datos.medico, opciones.hoy);

  const anteriores = new Map<string, FranjaFuente>();
  for (const anterior of datos.franjasAnteriores) {
    if (anterior.id !== datos.franja.id) anteriores.set(anterior.id, anterior);
  }
  for (const horario of [...anteriores.values(), datos.franja]) {
    if (opciones.omitirFranjas?.has(horario.id)) continue;
    const id = idFhir.franja(horario.id);
    const version = opciones.versiones[id];
    pares.push(put({ ...franja(horario, datos.medico), id }, claveLocal.franja(horario.id), version ? etiquetaVersion(version) : undefined));
  }

  const urn = urnPaciente(datos.paciente.seudonimo);
  pares.push([
    { fullUrl: urn, resource: paciente(datos.paciente), request: { method: 'PUT', url: urlCondicionalPaciente(datos.paciente.seudonimo) } },
    { recurso: 'Patient', claveLocal: datos.paciente.claveLocal },
  ]);
  pares.push(put({ ...cita(datos, urn), id: idFhir.cita(datos.id) }, claveLocal.cita(datos.id)));
  return armar(pares);
}

/**
 * Carga inicial (TC-02): EPS, IPS, sedes y, por cada médico, Practitioner,
 * PractitionerRole y Schedule. Se parte en Bundles de `tamano` entradas en
 * orden de dependencias, así cada referencia apunta a un recurso del mismo
 * Bundle o de uno anterior.
 */
export function bundlesMaestros(datos: DatosMaestros, hoy: string, tamano = 100): BundlePreparado[] {
  const sedes = new Map<string, SedeFuente>();
  for (const sede of datos.sedes) sedes.set(sede.id, sede);
  for (const medico of datos.medicos) if (medico.sede) sedes.set(medico.sede.id, medico.sede);
  const prestadores = new Map<string, PrestadorFuente>();
  for (const sede of sedes.values()) prestadores.set(sede.prestador.nit, sede.prestador);
  const eps = new Map<string, EpsFuente>();
  for (const entidad of datos.eps) eps.set(entidad.id, entidad);
  for (const medico of datos.medicos) eps.set(medico.eps.id, medico.eps);

  const pares: Par[] = [
    ...[...eps.values()].map((e) => put({ ...organizacionEps(e), id: idFhir.eps(e.id) }, claveLocal.eps(e.id))),
    ...[...prestadores.values()].map((p) => put({ ...organizacionIps(p), id: idFhir.prestador(p.nit) }, claveLocal.prestador(p.nit))),
    ...[...sedes.values()].map((s) => put({ ...ubicacion(s), id: idFhir.sede(s.id) }, claveLocal.sede(s.id))),
    ...datos.medicos.flatMap((m) => [
      put({ ...profesional(m), id: idFhir.medico(m.id) }, claveLocal.medico(m.id)),
      put({ ...rolProfesional(m), id: idFhir.rol(m.id) }, claveLocal.medico(m.id)),
      put({ ...agenda(m, hoy), id: idFhir.agenda(m.id) }, claveLocal.medico(m.id)),
    ]),
  ];

  const tamanoSeguro = Math.max(1, Math.floor(tamano));
  const bundles: BundlePreparado[] = [];
  for (let i = 0; i < pares.length; i += tamanoSeguro) bundles.push(armar(pares.slice(i, i + tamanoSeguro)));
  return bundles;
}
