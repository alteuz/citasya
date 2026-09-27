/**
 * AppointmentsService — Adaptador para crear y gestionar citas.
 * Los componentes NUNCA importan supabase directamente.
 */
import { supabase } from '@/lib/supabase';
import type { ServiceResult } from '@/types/common';
import type { AppointmentMode, AppointmentStatus } from '@/types/database';
import { mensajeDeError } from './errores';

type NotificationType = 'confirmation' | 'cancellation' | 'rescheduled';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface BookAppointmentInput {
  readonly slotId: string;
  readonly mode: AppointmentMode;
  readonly notes?: string;
}

export interface AppointmentDetail {
  readonly id: string;
  readonly status: AppointmentStatus;
  readonly mode: AppointmentMode;
  readonly notes: string | null;
  readonly bookedAt: string;
  readonly cancelledAt: string | null;
  readonly cancellationReason: string | null;
  readonly doctorName: string;
  readonly specialtyName: string;
  readonly epsName: string;
  readonly slotDate: string;
  readonly slotStartTime: string;
  readonly slotEndTime: string;
  readonly doctorId: string;
}

// ─── Servicio ───────────────────────────────────────────────────────────────

export const AppointmentsService = {
  /**
   * Agenda una nueva cita mediante la función transaccional `reservar_cita`.
   * La base de datos bloquea el horario, valida las reglas de negocio (EPS del
   * paciente, horario futuro y libre, una cita activa por especialidad) y crea
   * la cita en una sola transacción.
   */
  async bookAppointment(input: BookAppointmentInput): Promise<ServiceResult<AppointmentDetail>> {
    const { data: appointmentId, error } = await supabase.rpc('reservar_cita', {
      p_slot_id: input.slotId,
      p_modo: input.mode,
      p_notas: input.notes ?? null,
    });

    if (error || typeof appointmentId !== 'string') {
      return { success: false, error: mensajeDeError(error, 'No se pudo agendar la cita. Intenta de nuevo.') };
    }

    const detail = await AppointmentsService.getAppointmentById(appointmentId);
    if (detail.success) {
      // Enviar email de confirmación (no bloqueante)
      void sendNotificationEmail(appointmentId, 'confirmation');
    }
    return detail;
  },

  /**
   * Obtiene las citas del paciente autenticado.
   */
  async getMyAppointments(): Promise<ServiceResult<readonly AppointmentDetail[]>> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Debes iniciar sesión.' };
    }

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        status,
        mode,
        notes,
        booked_at,
        cancelled_at,
        cancellation_reason,
        doctors(full_name),
        specialties(name),
        eps(name),
        availability_slots(date, start_time, end_time)
      `)
      .eq('patient_id', user.id)
      .order('booked_at', { ascending: false });

    if (error) {
      return { success: false, error: 'No se pudieron cargar las citas.' };
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const appointments = (data ?? []).map((row: any) => mapAppointmentDetail(row));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return { success: true, data: appointments };
  },

  /**
   * Cancela una cita mediante `cancelar_cita` (valida propiedad, estado activo
   * y 24 h de anticipación en hora de Bogotá, y libera el horario).
   */
  async cancelAppointment(
    appointmentId: string,
    reason: string,
  ): Promise<ServiceResult<null>> {
    const { error } = await supabase.rpc('cancelar_cita', {
      p_cita_id: appointmentId,
      p_motivo: reason,
    });

    if (error) {
      return { success: false, error: mensajeDeError(error, 'No se pudo cancelar la cita. Intenta de nuevo.') };
    }

    // Enviar email de cancelación (no bloqueante)
    void sendNotificationEmail(appointmentId, 'cancellation');

    return { success: true, data: null };
  },

  /**
   * Obtiene una cita específica por su ID.
   */
  async getAppointmentById(id: string): Promise<ServiceResult<AppointmentDetail>> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Debes iniciar sesión.' };
    }

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        status,
        mode,
        notes,
        booked_at,
        cancelled_at,
        cancellation_reason,
        doctor_id,
        doctors(full_name),
        specialties(name),
        eps(name),
        availability_slots(date, start_time, end_time)
      `)
      .eq('id', id)
      .eq('patient_id', user.id)
      .single();

    if (error || !data) {
      return { success: false, error: 'No se pudo encontrar la cita.' };
    }

    return { success: true, data: mapAppointmentDetail(data) };
  },

  /**
   * Reprograma una cita mediante `reprogramar_cita` (mismo médico, horario
   * libre y futuro, 24 h de anticipación; libera el horario anterior).
   */
  async rescheduleAppointment(
    appointmentId: string,
    newSlotId: string,
    mode?: AppointmentMode,
    notes?: string
  ): Promise<ServiceResult<null>> {
    const { error } = await supabase.rpc('reprogramar_cita', {
      p_cita_id: appointmentId,
      p_nuevo_slot_id: newSlotId,
      p_modo: mode ?? null,
      p_notas: notes ?? null,
    });

    if (error) {
      return { success: false, error: mensajeDeError(error, 'No se pudo reprogramar la cita. Intenta de nuevo.') };
    }

    // Enviar email de reprogramación (no bloqueante)
    void sendNotificationEmail(appointmentId, 'rescheduled');

    return { success: true, data: null };
  },
} as const;

// ─── Mapper ─────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapAppointmentDetail(row: any): AppointmentDetail {
  return {
    id: row.id,
    status: row.status,
    mode: row.mode,
    notes: row.notes,
    bookedAt: row.booked_at,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    doctorName: row.doctors?.full_name ?? '',
    specialtyName: row.specialties?.name ?? '',
    epsName: row.eps?.name ?? '',
    slotDate: row.availability_slots?.date ?? '',
    slotStartTime: row.availability_slots?.start_time ?? '',
    slotEndTime: row.availability_slots?.end_time ?? '',
    doctorId: row.doctor_id ?? '',
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Notificaciones ─────────────────────────────────────────────────────────

/**
 * Invoca la Edge Function send-email de forma no bloqueante.
 * Los errores se registran en consola pero no afectan la UX.
 */
async function sendNotificationEmail(
  appointmentId: string,
  type: NotificationType,
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: { appointmentId, type },
    });

    if (error) {
      console.error('Error invocando send-email:', error);
    }
  } catch (err) {
    // No propagamos — el email es secundario, la operación de DB ya fue exitosa
    console.error('Error de red al enviar notificación:', err);
  }
}
