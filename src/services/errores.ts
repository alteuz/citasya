/**
 * Traducción de errores de Supabase a mensajes para el paciente.
 *
 * Las funciones de agendamiento de la base de datos (reservar_cita,
 * cancelar_cita, reprogramar_cita) lanzan errores con un código estable en
 * `message` (p. ej. HORARIO_NO_DISPONIBLE) y un texto pensado para el paciente
 * en `details`. Nunca se muestra el mensaje técnico de la base de datos: puede
 * exponer detalles internos (OWASP A05) y no es comprensible para el usuario.
 */

export interface ErrorDeSupabase {
  readonly message?: string;
  readonly details?: string | null;
  readonly code?: string;
}

/** Códigos de negocio que emiten las funciones de agendamiento. */
export const CODIGOS_AGENDAMIENTO = [
  'NO_AUTENTICADO',
  'MODALIDAD_INVALIDA',
  'NOTAS_DEMASIADO_LARGAS',
  'PERFIL_SIN_EPS',
  'HORARIO_NO_EXISTE',
  'HORARIO_NO_DISPONIBLE',
  'HORARIO_PASADO',
  'EPS_NO_CORRESPONDE',
  'CITA_DUPLICADA_ESPECIALIDAD',
  'CITA_NO_EXISTE',
  'CITA_NO_ACTIVA',
  'FUERA_DE_PLAZO',
  'MEDICO_DISTINTO',
] as const;

export type CodigoAgendamiento = (typeof CODIGOS_AGENDAMIENTO)[number];

const esCodigoAgendamiento = (valor: string | undefined): valor is CodigoAgendamiento =>
  (CODIGOS_AGENDAMIENTO as readonly string[]).includes(valor ?? '');

/** Código de negocio del error, si lo tiene. */
export function codigoDeError(error: ErrorDeSupabase | null | undefined): CodigoAgendamiento | null {
  return error && esCodigoAgendamiento(error.message) ? error.message : null;
}

/**
 * Mensaje apto para mostrar al paciente. Si el error es de negocio, se usa el
 * texto que definió la base de datos; en cualquier otro caso, `porDefecto`.
 */
export function mensajeDeError(error: ErrorDeSupabase | null | undefined, porDefecto: string): string {
  if (codigoDeError(error) && error?.details) return error.details;
  return porDefecto;
}
