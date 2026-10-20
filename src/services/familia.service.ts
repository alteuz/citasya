/**
 * FamiliaService — Familiares a cargo del titular de la cuenta (RF-13).
 * Los componentes NUNCA importan supabase directamente.
 *
 * La lectura usa la tabla `familiares`; RLS solo devuelve los del titular
 * autenticado. Registrar, editar y retirar pasa por funciones
 * transaccionales que validan los datos y responden con mensajes pensados
 * para la persona (ver errores.ts).
 */
import { obtenerSupabase } from '@/lib/supabase';
import type { ServiceResult } from '@/types/common';
import type { Familiar, Parentesco, TipoDocumento } from '@/types/database';
import { mensajeDeError } from './errores';

export interface FamiliarInput {
  readonly nombreCompleto: string;
  readonly tipoDocumento: TipoDocumento;
  readonly numeroDocumento: string;
  /** AAAA-MM-DD */
  readonly fechaNacimiento: string;
  readonly parentesco: Parentesco;
  readonly epsId: string;
  /** Declaración de representación o autorización (Ley 1581 de 2012). */
  readonly autorizacion: boolean;
}

export const FamiliaService = {
  /** Familiares activos del titular, en el orden en que se registraron. */
  async listar(): Promise<ServiceResult<readonly Familiar[]>> {
    const supabase = await obtenerSupabase();
    const { data, error } = await supabase
      .from('familiares')
      .select('id, nombre_completo, tipo_documento, numero_documento, fecha_nacimiento, parentesco, eps_id, eps(name)')
      .eq('activo', true)
      .order('creado_en');

    if (error) {
      return { success: false, error: 'No se pudo cargar tu familia.' };
    }

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    return { success: true, data: (data ?? []).map((row: any) => mapFamiliar(row)) };
  },

  /** Registra un familiar o, si se pasa `id`, actualiza sus datos. Devuelve su id. */
  async guardar(input: FamiliarInput, id?: string): Promise<ServiceResult<string>> {
    const supabase = await obtenerSupabase();
    const { data, error } = await supabase.rpc('guardar_familiar', {
      p_nombre: input.nombreCompleto,
      p_tipo_documento: input.tipoDocumento,
      p_numero_documento: input.numeroDocumento,
      p_fecha_nacimiento: input.fechaNacimiento,
      p_parentesco: input.parentesco,
      p_eps_id: input.epsId,
      p_autorizacion: input.autorizacion,
      p_id: id ?? null,
    });

    if (error || typeof data !== 'string') {
      return { success: false, error: mensajeDeError(error, 'No se pudieron guardar los datos. Intenta de nuevo.') };
    }
    return { success: true, data };
  },

  /** Retira a un familiar de la cuenta. Su historial de citas se conserva. */
  async retirar(id: string): Promise<ServiceResult<null>> {
    const supabase = await obtenerSupabase();
    const { error } = await supabase.rpc('retirar_familiar', { p_id: id });

    if (error) {
      return { success: false, error: mensajeDeError(error, 'No se pudo retirar a tu familiar. Intenta de nuevo.') };
    }
    return { success: true, data: null };
  },
} as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapFamiliar(row: any): Familiar {
  return {
    id: row.id,
    nombreCompleto: row.nombre_completo ?? '',
    tipoDocumento: row.tipo_documento,
    numeroDocumento: row.numero_documento ?? '',
    fechaNacimiento: row.fecha_nacimiento ?? '',
    parentesco: row.parentesco,
    epsId: row.eps_id ?? '',
    epsName: row.eps?.name ?? '',
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
