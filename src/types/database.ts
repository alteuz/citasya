/**
 * Branded type helper — previene mezclar IDs de distintas entidades.
 * Uso: const userId: UUID = validateUUID(raw);
 */
export type UUID = string & { readonly __brand: 'UUID' };

// ─── Enums de dominio ───────────────────────────────────────────────────────

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
export type NotificationType = 'confirmation' | 'reminder' | 'cancellation';
export type UserRole = 'patient' | 'admin';
export type AppointmentMode = 'presencial' | 'telemedicina';

// ─── Entidades de dominio ───────────────────────────────────────────────────

export interface Profile {
  readonly id: UUID;
  readonly cedula: string;
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly role: UserRole;
  /** Vacío si el perfil todavía no tiene EPS registrada (H-37). */
  readonly epsId: UUID;
  readonly epsName: string;
  readonly createdAt: string;
}

// ─── Modelo familiar (RF-13) ────────────────────────────────────────────────

export type Parentesco = 'hijo' | 'padre_madre' | 'conyuge' | 'hermano' | 'abuelo' | 'nieto' | 'otro';
/** Registro civil, tarjeta de identidad, cédula de ciudadanía, cédula de extranjería, pasaporte. */
export type TipoDocumento = 'RC' | 'TI' | 'CC' | 'CE' | 'PA';

/** Persona a cargo del titular de la cuenta. No tiene cuenta propia. */
export interface Familiar {
  readonly id: string;
  readonly nombreCompleto: string;
  readonly tipoDocumento: TipoDocumento;
  readonly numeroDocumento: string;
  /** AAAA-MM-DD */
  readonly fechaNacimiento: string;
  readonly parentesco: Parentesco;
  readonly epsId: string;
  readonly epsName: string;
}

export interface EPS {
  readonly id: UUID;
  readonly name: string;
  readonly nit: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly active: boolean;
}

export interface Specialty {
  readonly id: UUID;
  readonly name: string;
  readonly description: string;
}

export interface Doctor {
  readonly id: UUID;
  readonly fullName: string;
  readonly specialtyId: UUID;
  readonly epsId: UUID;
  readonly licenseNumber: string;
  readonly active: boolean;
}

export interface AvailabilitySlot {
  readonly id: UUID;
  readonly doctorId: UUID;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly isBooked: boolean;
}

export interface Appointment {
  readonly id: UUID;
  readonly patientId: UUID;
  readonly doctorId: UUID;
  readonly slotId: UUID;
  readonly epsId: UUID;
  readonly specialtyId: UUID;
  readonly status: AppointmentStatus;
  readonly mode: AppointmentMode;
  readonly notes: string | null;
  readonly bookedAt: string;
  readonly cancelledAt: string | null;
  readonly cancellationReason: string | null;
}

export interface Notification {
  readonly id: UUID;
  readonly appointmentId: UUID;
  readonly type: NotificationType;
  readonly sentAt: string;
  readonly status: string;
}
