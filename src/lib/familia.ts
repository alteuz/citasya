/**
 * Modelo familiar (RF-13).
 *
 * Etiquetas, edad y validación de los datos de un familiar, y elección de para
 * quién se pide una cita. La base de datos aplica las mismas reglas
 * (guardar_familiar, reservar_cita); aquí sirven para orientar a la persona
 * antes de enviar, con mensajes en lenguaje claro.
 */
import type { Familiar, Parentesco, TipoDocumento } from '@/types/database';

export const MAX_FAMILIARES = 10;

export const PARENTESCOS: ReadonlyArray<{ readonly valor: Parentesco; readonly etiqueta: string }> = [
  { valor: 'hijo', etiqueta: 'Hijo o hija' },
  { valor: 'padre_madre', etiqueta: 'Padre o madre' },
  { valor: 'conyuge', etiqueta: 'Cónyuge o pareja' },
  { valor: 'hermano', etiqueta: 'Hermano o hermana' },
  { valor: 'abuelo', etiqueta: 'Abuelo o abuela' },
  { valor: 'nieto', etiqueta: 'Nieto o nieta' },
  { valor: 'otro', etiqueta: 'Otro familiar' },
];

export const TIPOS_DOCUMENTO: ReadonlyArray<{ readonly valor: TipoDocumento; readonly etiqueta: string }> = [
  { valor: 'RC', etiqueta: 'Registro civil' },
  { valor: 'TI', etiqueta: 'Tarjeta de identidad' },
  { valor: 'CC', etiqueta: 'Cédula de ciudadanía' },
  { valor: 'CE', etiqueta: 'Cédula de extranjería' },
  { valor: 'PA', etiqueta: 'Pasaporte' },
];

export const etiquetaParentesco = (parentesco: Parentesco): string =>
  PARENTESCOS.find((p) => p.valor === parentesco)?.etiqueta ?? 'Familiar';

export const etiquetaTipoDocumento = (tipo: TipoDocumento): string =>
  TIPOS_DOCUMENTO.find((t) => t.valor === tipo)?.etiqueta ?? tipo;

/** Fecha de hoy en Bogotá (UTC−5, sin horario de verano), como AAAA-MM-DD. */
export function hoyEnBogota(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Edad cumplida en años, con la fecha de hoy en Bogotá. */
export function edadEnAnios(fechaNacimiento: string, ahora: Date = new Date()): number {
  const [anio = 0, mes = 0, dia = 0] = fechaNacimiento.split('-').map(Number);
  const [hoyAnio = 0, hoyMes = 0, hoyDia = 0] = hoyEnBogota(ahora).split('-').map(Number);
  const yaCumplio = hoyMes > mes || (hoyMes === mes && hoyDia >= dia);
  return hoyAnio - anio - (yaCumplio ? 0 : 1);
}

/** Documento que suele corresponder a la edad: registro civil, tarjeta de identidad o cédula. */
export function tipoDocumentoSugerido(edad: number): TipoDocumento {
  if (edad < 7) return 'RC';
  if (edad < 18) return 'TI';
  return 'CC';
}

// ─── Formulario ─────────────────────────────────────────────────────────────

export interface DatosFamiliar {
  readonly nombreCompleto: string;
  readonly tipoDocumento: TipoDocumento | '';
  readonly numeroDocumento: string;
  readonly fechaNacimiento: string;
  readonly parentesco: Parentesco | '';
  readonly epsId: string;
  /** Declaración de representación o autorización (Ley 1581 de 2012). Solo se exige al registrar. */
  readonly autorizacion: boolean;
}

export type ErroresFamiliar = Partial<Record<keyof DatosFamiliar, string>>;

/** Validación previa al envío; usa los mismos criterios que guardar_familiar en la base de datos. */
export function validarFamiliar(
  datos: DatosFamiliar,
  { esNuevo, ahora = new Date() }: { readonly esNuevo: boolean; readonly ahora?: Date },
): ErroresFamiliar {
  const errores: Partial<Record<keyof DatosFamiliar, string>> = {};
  const nombre = datos.nombreCompleto.trim().replace(/\s+/g, ' ');

  if (nombre.length < 3 || nombre.length > 120) errores.nombreCompleto = 'Escribe el nombre completo de tu familiar.';
  if (!datos.parentesco) errores.parentesco = 'Selecciona el parentesco.';
  if (!datos.fechaNacimiento) {
    errores.fechaNacimiento = 'Escribe la fecha de nacimiento.';
  } else if (datos.fechaNacimiento > hoyEnBogota(ahora) || datos.fechaNacimiento < '1900-01-01') {
    errores.fechaNacimiento = 'Revisa la fecha de nacimiento.';
  }
  if (!datos.tipoDocumento) errores.tipoDocumento = 'Selecciona el tipo de documento.';
  if (!/^[0-9A-Za-z]{4,15}$/.test(datos.numeroDocumento.trim())) {
    errores.numeroDocumento = 'Escribe entre 4 y 15 letras o números, sin puntos ni espacios.';
  }
  if (!datos.epsId) errores.epsId = 'Selecciona la EPS de tu familiar.';
  if (esNuevo && !datos.autorizacion) {
    errores.autorizacion = 'Confirma que eres su representante o que tienes su autorización.';
  }
  return errores;
}

// ─── ¿Para quién es la cita? ────────────────────────────────────────────────

/** Clave del titular en el selector; los familiares usan su id. */
export const PARA_MI = 'titular';

export interface OpcionPaciente {
  /** PARA_MI o el id del familiar */
  readonly clave: string;
  /** null si la cita es para el titular */
  readonly familiarId: string | null;
  readonly nombre: string;
  readonly detalle: string;
  readonly epsId: string;
  /** Solo se puede elegir a quien pertenece a la EPS del médico. */
  readonly habilitada: boolean;
}

/**
 * Personas para quienes se puede pedir la cita: el titular y sus familiares.
 * Si se conoce la EPS del médico, solo quedan habilitadas las personas de esa EPS.
 */
export function opcionesDePaciente(
  titular: { readonly epsId: string; readonly epsName: string },
  familiares: readonly Familiar[],
  epsDelMedico: string | null,
): OpcionPaciente[] {
  const habilitada = (eps: string) => Boolean(eps) && (!epsDelMedico || eps === epsDelMedico);
  return [
    {
      clave: PARA_MI,
      familiarId: null,
      nombre: 'Para mí',
      detalle: titular.epsName || 'Sin EPS registrada',
      epsId: titular.epsId,
      habilitada: habilitada(titular.epsId),
    },
    ...familiares.map((f) => ({
      clave: f.id,
      familiarId: f.id,
      nombre: f.nombreCompleto,
      detalle: `${etiquetaParentesco(f.parentesco)} · ${f.epsName}`,
      epsId: f.epsId,
      habilitada: habilitada(f.epsId),
    })),
  ];
}

/**
 * Persona elegida por defecto, en este orden: la que se pidió (por ejemplo, con
 * «Pedir cita» en «Mi familia») si está habilitada; si no, el titular; si no,
 * el primer familiar habilitado. Devuelve null si nadie pertenece a la EPS del médico.
 */
export function pacientePorDefecto(opciones: readonly OpcionPaciente[], pedida: string | null): string | null {
  const habilitadas = opciones.filter((o) => o.habilitada);
  return (
    habilitadas.find((o) => o.clave === pedida)?.clave ??
    habilitadas.find((o) => o.clave === PARA_MI)?.clave ??
    habilitadas[0]?.clave ??
    null
  );
}
