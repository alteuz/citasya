/**
 * DoctorsService — Adaptador para consultas de médicos y disponibilidad.
 * Los componentes NUNCA importan supabase directamente.
 */
import { supabase } from '@/lib/supabase';
import type { ServiceResult } from '@/types/common';

// ─── Tipos de resultado ─────────────────────────────────────────────────────

export interface DoctorSearchResult {
  readonly id: string;
  readonly fullName: string;
  readonly licenseNumber: string;
  readonly specialtyId: string;
  readonly specialtyName: string;
  readonly epsId: string;
  readonly epsName: string;
}

export interface SlotResult {
  readonly id: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly isBooked: boolean;
}

export interface SearchFilters {
  readonly specialtyId?: string;
  readonly epsId?: string;
  readonly date?: string;
  readonly mode?: 'presencial' | 'telemedicina';
}

export interface SpecialtyOption {
  readonly id: string;
  readonly name: string;
}

export interface EpsOption {
  readonly id: string;
  readonly name: string;
}

// ─── Servicio ───────────────────────────────────────────────────────────────

export const DoctorsService = {
  /**
   * Obtiene todas las especialidades activas.
   */
  async getSpecialties(): Promise<ServiceResult<readonly SpecialtyOption[]>> {
    const { data, error } = await supabase
      .from('specialties')
      .select('id, name')
      .order('name');

    if (error) {
      return { success: false, error: 'No se pudieron cargar las especialidades.' };
    }

    return { success: true, data: data ?? [] };
  },

  /**
   * Obtiene todas las EPS activas.
   */
  async getEpsList(): Promise<ServiceResult<readonly EpsOption[]>> {
    const { data, error } = await supabase
      .from('eps')
      .select('id, name')
      .eq('active', true)
      .order('name');

    if (error) {
      return { success: false, error: 'No se pudieron cargar las EPS.' };
    }

    return { success: true, data: data ?? [] };
  },

  /**
   * Busca médicos filtrados por especialidad y/o EPS.
   */
  async searchDoctors(filters: SearchFilters): Promise<ServiceResult<readonly DoctorSearchResult[]>> {
    let query = supabase
      .from('doctors')
      .select(`
        id,
        full_name,
        license_number,
        specialty_id,
        eps_id,
        specialties!inner(name),
        eps!inner(name)
      `)
      .eq('active', true);

    if (filters.specialtyId) {
      query = query.eq('specialty_id', filters.specialtyId);
    }

    if (filters.epsId) {
      query = query.eq('eps_id', filters.epsId);
    }

    query = query.order('full_name');

    const { data, error } = await query;

    if (error) {
      return { success: false, error: 'No se pudieron buscar los médicos.' };
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const doctors: DoctorSearchResult[] = (data ?? []).map((row: any) => ({
      id: row.id,
      fullName: row.full_name,
      licenseNumber: row.license_number,
      specialtyId: row.specialty_id,
      specialtyName: row.specialties?.name ?? '',
      epsId: row.eps_id,
      epsName: row.eps?.name ?? '',
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return { success: true, data: doctors };
  },

  /**
   * Obtiene los slots disponibles de un médico para una fecha o rango.
   */
  async getAvailableSlots(
    doctorId: string,
    date?: string,
  ): Promise<ServiceResult<readonly SlotResult[]>> {
    let query = supabase
      .from('availability_slots')
      .select('id, date, start_time, end_time, is_booked')
      .eq('doctor_id', doctorId)
      .eq('is_booked', false)
      .order('date')
      .order('start_time');

    if (date) {
      query = query.eq('date', date);
    } else {
      // Por defecto, solo slots futuros (próximos 14 días)
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('date', today);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: 'No se pudieron cargar los horarios disponibles.' };
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const slots: SlotResult[] = (data ?? []).map((row: any) => ({
      id: row.id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      isBooked: row.is_booked,
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return { success: true, data: slots };
  },

  /**
   * Obtiene un médico por ID con su especialidad y EPS.
   */
  async getDoctorById(doctorId: string): Promise<ServiceResult<DoctorSearchResult>> {
    const { data, error } = await supabase
      .from('doctors')
      .select(`
        id,
        full_name,
        license_number,
        specialty_id,
        eps_id,
        specialties(name),
        eps(name)
      `)
      .eq('id', doctorId)
      .single();

    if (error || !data) {
      return { success: false, error: 'No se encontró el médico.' };
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
        specialtyId: row.specialty_id,
        specialtyName: row.specialties?.name ?? '',
        epsId: row.eps_id,
        epsName: row.eps?.name ?? '',
      },
    };
  },
} as const;
