/**
 * AppointmentsService — Adaptador para crear y gestionar citas.
 * Los componentes NUNCA importan supabase directamente.
 */
import { supabase } from '@/lib/supabase';
import type { ServiceResult } from '@/types/common';
import type { AppointmentMode, AppointmentStatus } from '@/types/database';

type NotificationType = 'confirmation' | 'cancellation' | 'rescheduled';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface BookAppointmentInput {
  readonly slotId: string;
  readonly doctorId: string;
  readonly epsId: string;
  readonly specialtyId: string;
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
   * Agenda una nueva cita.
   * El trigger en BD marca automáticamente el slot como reservado.
   */
  async bookAppointment(input: BookAppointmentInput): Promise<ServiceResult<AppointmentDetail>> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Debes iniciar sesión para agendar una cita.' };
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: user.id,
        slot_id: input.slotId,
        doctor_id: input.doctorId,
        eps_id: input.epsId,
        specialty_id: input.specialtyId,
        mode: input.mode,
        notes: input.notes ?? null,
      })
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
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Este horario ya fue reservado. Intenta con otro.' };
      }
      return { success: false, error: `No se pudo agendar la cita: ${error.message}` };
    }

    const mapped = mapAppointmentDetail(data);

    // Enviar email de confirmación (no bloqueante)
    void sendNotificationEmail(mapped.id, 'confirmation');

    return { success: true, data: mapped };
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
   * Cancela una cita (el trigger valida 24h de anticipación).
   */
  async cancelAppointment(
    appointmentId: string,
    reason: string,
  ): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
      })
      .eq('id', appointmentId);

    if (error) {
      if (error.message.includes('24 horas')) {
        return { success: false, error: 'No se puede cancelar una cita con menos de 24 horas de anticipación.' };
      }
      return { success: false, error: `Error al cancelar: ${error.message}` };
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
   * Reprograma una cita cambiando su slot.
   */
  async rescheduleAppointment(
    appointmentId: string,
    newSlotId: string,
    mode?: AppointmentMode,
    notes?: string
  ): Promise<ServiceResult<null>> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Debes iniciar sesión.' };
    }

    const updateData: Record<string, any> = {
      slot_id: newSlotId,
    };

    if (mode) updateData.mode = mode;
    if (notes !== undefined) updateData.notes = notes;

    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .eq('patient_id', user.id);

    if (error) {
      if (error.message.includes('24 horas')) {
        return { success: false, error: 'No se puede reprogramar una cita con menos de 24 horas de anticipación.' };
      }
      if (error.code === '23505') {
         return { success: false, error: 'El nuevo horario ya fue reservado. Intenta con otro.' };
      }
      return { success: false, error: `Error al reprogramar: ${error.message}` };
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
