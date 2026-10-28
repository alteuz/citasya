/**
 * Reglas de tiempo de las citas (H-36).
 *
 * - Una cita activa cuya hora ya terminó no es «próxima»: pasa al historial.
 * - Una cita solo se puede cancelar o reprogramar con al menos 24 horas de
 *   anticipación. Es la misma regla que aplica la base de datos; aquí se usa
 *   para no ofrecer acciones que el servidor va a rechazar.
 *
 * Los horarios se guardan como fecha y hora locales de Bogotá. Colombia no usa
 * horario de verano, así que el desfase siempre es UTC−5, sin importar la zona
 * horaria del dispositivo.
 */
import type { AppointmentStatus } from '@/types/database';

const DESFASE_BOGOTA = '-05:00';
const MS_MINIMOS_PARA_MODIFICAR = 24 * 60 * 60 * 1000;

/** Lo mínimo que se necesita de una cita para aplicar las reglas de tiempo. */
export interface HorarioDeCita {
  readonly status: AppointmentStatus;
  /** AAAA-MM-DD */
  readonly slotDate: string;
  /** HH:MM o HH:MM:SS, hora de Bogotá */
  readonly slotStartTime: string;
  readonly slotEndTime: string;
}

/** Estado que ve el paciente: una cita activa que ya terminó se muestra como «pasada». */
export type EstadoVisible = AppointmentStatus | 'pasada';

/** Instante correspondiente a una fecha y una hora locales de Bogotá. */
export function instanteBogota(fecha: string, hora: string): Date {
  const hhmmss = hora.length === 5 ? `${hora}:00` : hora.slice(0, 8);
  return new Date(`${fecha}T${hhmmss}${DESFASE_BOGOTA}`);
}

export const inicioDeCita = (cita: HorarioDeCita): Date => instanteBogota(cita.slotDate, cita.slotStartTime);
export const finDeCita = (cita: HorarioDeCita): Date => instanteBogota(cita.slotDate, cita.slotEndTime);

/** Programada o reprogramada (las que bloquean un horario). */
export const esActiva = (status: AppointmentStatus): boolean =>
  status === 'scheduled' || status === 'rescheduled';

/** Activa y todavía no terminada. */
export function esProxima(cita: HorarioDeCita, ahora: Date = new Date()): boolean {
  return esActiva(cita.status) && finDeCita(cita).getTime() > ahora.getTime();
}

/** Activa y con al menos 24 horas antes de empezar (regla de la base de datos). */
export function puedeModificarse(cita: HorarioDeCita, ahora: Date = new Date()): boolean {
  return esActiva(cita.status) && inicioDeCita(cita).getTime() - ahora.getTime() >= MS_MINIMOS_PARA_MODIFICAR;
}

export function estadoVisible(cita: HorarioDeCita, ahora: Date = new Date()): EstadoVisible {
  return esActiva(cita.status) && !esProxima(cita, ahora) ? 'pasada' : cita.status;
}

/** Fecha de hoy en Bogotá (AAAA-MM-DD), sin depender de la zona horaria del dispositivo. */
export function hoyEnBogota(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Solo los horarios que todavía no empiezan (H-42): la disponibilidad de hoy
 * no debe ofrecer horas que ya pasaron. La base de datos también lo rechaza
 * (HORARIO_PASADO), pero ofrecerlas confunde a la persona.
 */
export function horariosFuturos<T extends { readonly date: string; readonly startTime: string }>(
  horarios: readonly T[],
  ahora: Date = new Date(),
): T[] {
  return horarios.filter((h) => instanteBogota(h.date, h.startTime).getTime() > ahora.getTime());
}

/**
 * Separa las citas en próximas (de la más cercana a la más lejana) e historial
 * (de la más reciente a la más antigua). Una cita sin horario válido va al historial.
 */
export function separarCitas<T extends HorarioDeCita>(
  citas: readonly T[],
  ahora: Date = new Date(),
): { readonly proximas: readonly T[]; readonly historial: readonly T[] } {
  const inicio = (cita: T): number => inicioDeCita(cita).getTime() || 0;
  const proximas = citas.filter((cita) => esProxima(cita, ahora)).sort((a, b) => inicio(a) - inicio(b));
  const historial = citas.filter((cita) => !esProxima(cita, ahora)).sort((a, b) => inicio(b) - inicio(a));
  return { proximas, historial };
}
