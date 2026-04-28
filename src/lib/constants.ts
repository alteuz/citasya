/**
 * Constantes de aplicación.
 * Punto central para labels, opciones y configuraciones estáticas.
 */

export const APP_NAME = 'CitasYA' as const;
export const APP_TAGLINE = 'Tu salud. Donde estés. Cuando la necesites.' as const;

export const SPECIALTIES = [
  'Medicina General',
  'Cardiología',
  'Pediatría',
  'Ginecología',
  'Psicología',
  'Dermatología',
  'Ortopedia',
  'Oftalmología',
] as const;

export const POPULAR_SPECIALTIES = SPECIALTIES.slice(0, 5);

export const EPS_LIST = [
  'Sura EPS',
  'Nueva EPS',
  'Sanitas',
  'Compensar',
  'Famisanar',
  'Salud Total',
  'Coomeva EPS',
  'Medimás',
] as const;

export const APPOINTMENT_MODE_LABELS = {
  presencial: 'Presencial',
  telemedicina: 'Telemedicina',
} as const;

export const STATS = [
  { value: '15+', label: 'EPS vinculadas' },
  { value: '50K+', label: 'Citas agendadas' },
  { value: '4.8', label: 'Calificación promedio' },
] as const;

export const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: 'Busca tu especialidad',
    description: 'Selecciona la especialidad, tu EPS y la fecha que prefieras.',
    icon: '🔍',
  },
  {
    step: 2,
    title: 'Elige tu médico',
    description: 'Revisa los horarios disponibles y selecciona el que más te convenga.',
    icon: '👨‍⚕️',
  },
  {
    step: 3,
    title: 'Confirma tu cita',
    description: 'Recibe tu comprobante al instante y un recordatorio antes de tu cita.',
    icon: '✅',
  },
] as const;

/** Horas mínimas de anticipación para cancelar una cita */
export const CANCELLATION_MIN_HOURS = 24;
