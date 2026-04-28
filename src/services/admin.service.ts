/**
 * AdminService — Adaptador para operaciones de administración.
 * CRUD de médicos, generación de slots y vista global de citas.
 */
import { supabase } from '@/lib/supabase';
import type { ServiceResult } from '@/types/common';
import type { AppointmentStatus } from '@/types/database';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface AdminDoctor {
  readonly id: string;
  readonly fullName: string;
  readonly licenseNumber: string;
  readonly phone: string;
  readonly email: string;
  readonly active: boolean;
  readonly specialtyId: string;
  readonly specialtyName: string;
  readonly epsId: string;
  readonly epsName: string;
  readonly createdAt: string;
}

export interface CreateDoctorInput {
  readonly fullName: string;
  readonly licenseNumber: string;
  readonly specialtyId: string;
  readonly epsId: string;
  readonly phone?: string;
  readonly email?: string;
}

export interface UpdateDoctorInput {
  readonly fullName?: string;
  readonly licenseNumber?: string;
  readonly specialtyId?: string;
  readonly epsId?: string;
  readonly phone?: string;
  readonly email?: string;
}

export interface AdminSlot {
  readonly id: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly isBooked: boolean;
}

export interface GenerateSlotsInput {
  readonly doctorId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly startHour: number;
  readonly endHour: number;
  readonly slotDurationMinutes: number;
  readonly excludeWeekends: boolean;
}

export interface AdminAppointment {
  readonly id: string;
  readonly patientName: string;
  readonly patientEmail: string;
  readonly doctorName: string;
  readonly specialtyName: string;
  readonly epsName: string;
  readonly slotDate: string;
  readonly slotStartTime: string;
  readonly slotEndTime: string;
  readonly status: AppointmentStatus;
  readonly mode: string;
  readonly bookedAt: string;
}

export interface AdminStats {
  readonly totalDoctors: number;
  readonly totalAppointments: number;
  readonly scheduledToday: number;
  readonly cancelledTotal: number;
}

// ─── Servicio ───────────────────────────────────────────────────────────────

export const AdminService = {
  // ─── Stats ──────────────────────────────────────────────────────────────

  async getStats(): Promise<ServiceResult<AdminStats>> {
    const today = new Date().toISOString().split('T')[0] ?? '';

    const [doctorsRes, apptRes, todayRes, cancelledRes] = await Promise.all([
      supabase.from('doctors').select('id', { count: 'exact', head: true }),
      supabase.from('appointments').select('id', { count: 'exact', head: true }),
      supabase
        .from('appointments')
        .select('id, availability_slots!inner(date)', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .eq('availability_slots.date', today),
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'cancelled'),
    ]);

    return {
      success: true,
      data: {
        totalDoctors: doctorsRes.count ?? 0,
        totalAppointments: apptRes.count ?? 0,
        scheduledToday: todayRes.count ?? 0,
        cancelledTotal: cancelledRes.count ?? 0,
      },
    };
  },

  // ─── Doctors ────────────────────────────────────────────────────────────

  async getAllDoctors(): Promise<ServiceResult<readonly AdminDoctor[]>> {
    const { data, error } = await supabase
      .from('doctors')
      .select(`
        id, full_name, license_number, phone, email, active, specialty_id, eps_id, created_at,
        specialties(name),
        eps(name)
      `)
      .order('full_name');

    if (error) {
      return { success: false, error: `Error cargando médicos: ${error.message}` };
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const doctors: AdminDoctor[] = (data ?? []).map((row: any) => ({
      id: row.id,
      fullName: row.full_name,
      licenseNumber: row.license_number,
      phone: row.phone ?? '',
      email: row.email ?? '',
      active: row.active,
      specialtyId: row.specialty_id,
      specialtyName: row.specialties?.name ?? '',
      epsId: row.eps_id,
      epsName: row.eps?.name ?? '',
      createdAt: row.created_at,
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return { success: true, data: doctors };
  },

  async createDoctor(input: CreateDoctorInput): Promise<ServiceResult<AdminDoctor>> {
    const { data, error } = await supabase
      .from('doctors')
      .insert({
        full_name: input.fullName,
        license_number: input.licenseNumber,
        specialty_id: input.specialtyId,
        eps_id: input.epsId,
        phone: input.phone ?? '',
        email: input.email ?? '',
      })
      .select(`
        id, full_name, license_number, phone, email, active, specialty_id, eps_id, created_at,
        specialties(name),
        eps(name)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Ya existe un médico con ese número de registro.' };
      }
      return { success: false, error: `Error creando médico: ${error.message}` };
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const row = data as any;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return {
      success: true,
      data: {
        id: row.id,
        fullName: row.full_name,
        licenseNumber: row.license_number,
        phone: row.phone ?? '',
        email: row.email ?? '',
        active: row.active,
        specialtyId: row.specialty_id,
        specialtyName: row.specialties?.name ?? '',
        epsId: row.eps_id,
        epsName: row.eps?.name ?? '',
        createdAt: row.created_at,
      },
    };
  },

  async updateDoctor(id: string, input: UpdateDoctorInput): Promise<ServiceResult<null>> {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const updateData: Record<string, any> = {};
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (input.fullName !== undefined) updateData.full_name = input.fullName;
    if (input.licenseNumber !== undefined) updateData.license_number = input.licenseNumber;
    if (input.specialtyId !== undefined) updateData.specialty_id = input.specialtyId;
    if (input.epsId !== undefined) updateData.eps_id = input.epsId;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;

    const { error } = await supabase
      .from('doctors')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return { success: false, error: `Error actualizando médico: ${error.message}` };
    }

    return { success: true, data: null };
  },

  async toggleDoctorActive(id: string, active: boolean): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('doctors')
      .update({ active })
      .eq('id', id);

    if (error) {
      return { success: false, error: `Error cambiando estado: ${error.message}` };
    }

    return { success: true, data: null };
  },

  // ─── Slots ──────────────────────────────────────────────────────────────

  async getDoctorSlots(doctorId: string, date?: string): Promise<ServiceResult<readonly AdminSlot[]>> {
    let query = supabase
      .from('availability_slots')
      .select('id, date, start_time, end_time, is_booked')
      .eq('doctor_id', doctorId)
      .order('date')
      .order('start_time');

    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: `Error cargando slots: ${error.message}` };
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const slots: AdminSlot[] = (data ?? []).map((row: any) => ({
      id: row.id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      isBooked: row.is_booked,
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return { success: true, data: slots };
  },

  async generateSlots(input: GenerateSlotsInput): Promise<ServiceResult<number>> {
    const slots: Array<{
      doctor_id: string;
      date: string;
      start_time: string;
      end_time: string;
    }> = [];

    const start = new Date(input.startDate + 'T00:00:00');
    const end = new Date(input.endDate + 'T00:00:00');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();

      // Excluir sábados (6) y domingos (0) si se solicita
      if (input.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue;
      }

      const dateStr = d.toISOString().split('T')[0] ?? '';

      for (let h = input.startHour; h < input.endHour; ) {
        const startMinutes = h * 60;
        const endMinutes = startMinutes + input.slotDurationMinutes;

        if (endMinutes > input.endHour * 60) break;

        const startH = Math.floor(startMinutes / 60);
        const startM = startMinutes % 60;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;

        slots.push({
          doctor_id: input.doctorId,
          date: dateStr,
          start_time: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`,
          end_time: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`,
        });

        h = endMinutes / 60;
      }
    }

    if (slots.length === 0) {
      return { success: false, error: 'No se generaron slots con los parámetros indicados.' };
    }

    // Insertar ignorando duplicados (upsert con onConflict)
    const { error } = await supabase
      .from('availability_slots')
      .upsert(slots, { onConflict: 'doctor_id,date,start_time', ignoreDuplicates: true });

    if (error) {
      return { success: false, error: `Error generando slots: ${error.message}` };
    }

    return { success: true, data: slots.length };
  },

  async deleteSlot(slotId: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('availability_slots')
      .delete()
      .eq('id', slotId)
      .eq('is_booked', false);

    if (error) {
      return { success: false, error: 'No se pudo eliminar el slot. Puede que ya esté reservado.' };
    }

    return { success: true, data: null };
  },

  // ─── Appointments ───────────────────────────────────────────────────────

  async getAllAppointments(statusFilter?: AppointmentStatus): Promise<ServiceResult<readonly AdminAppointment[]>> {
    let query = supabase
      .from('appointments')
      .select(`
        id, status, mode, booked_at,
        profiles!appointments_patient_id_fkey(full_name, email),
        doctors(full_name),
        specialties(name),
        eps(name),
        availability_slots(date, start_time, end_time)
      `)
      .order('booked_at', { ascending: false })
      .limit(200);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: `Error cargando citas: ${error.message}` };
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const appointments: AdminAppointment[] = (data ?? []).map((row: any) => ({
      id: row.id,
      patientName: row.profiles?.full_name ?? 'N/A',
      patientEmail: row.profiles?.email ?? '',
      doctorName: row.doctors?.full_name ?? '',
      specialtyName: row.specialties?.name ?? '',
      epsName: row.eps?.name ?? '',
      slotDate: row.availability_slots?.date ?? '',
      slotStartTime: row.availability_slots?.start_time ?? '',
      slotEndTime: row.availability_slots?.end_time ?? '',
      status: row.status,
      mode: row.mode,
      bookedAt: row.booked_at,
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return { success: true, data: appointments };
  },
} as const;
