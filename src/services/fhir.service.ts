/**
 * FhirService — Estado de la interoperabilidad HL7 FHIR (ADR-0009), solo para administradores.
 * Los componentes NUNCA importan supabase directamente.
 *
 * El resumen sale de la función `admin_fhir_resumen` (verifica el rol en la
 * base de datos). Las acciones invocan la Edge Function `fhir-sync` con la
 * sesión del administrador; la función vuelve a verificar el rol.
 */
import { obtenerSupabase } from '@/lib/supabase';
import type { ServiceResult } from '@/types/common';
import { mensajeDeError } from './errores';

export type EstadoEventoFhir = 'pendiente' | 'procesando' | 'publicado' | 'conflicto' | 'fallido';

export interface EventoFhir {
  readonly id: number;
  readonly citaId: string;
  readonly estado: EstadoEventoFhir;
  readonly intentos: number;
  readonly creadoEn: string;
  readonly procesadoEn: string | null;
  readonly error: string | null;
  readonly servidor: string | null;
  /** Recurso Appointment publicado (id lógico y versión), si ya existe. */
  readonly appointment: { readonly id: string; readonly version: string } | null;
}

export interface ResumenFhir {
  readonly estados: Readonly<Partial<Record<EstadoEventoFhir, number>>>;
  /** Recursos publicados por tipo (Organization, Location, Slot…). */
  readonly recursos: Readonly<Record<string, number>>;
  readonly servidor: string | null;
  readonly eventos: readonly EventoFhir[];
}

export type AccionFhir = 'sincronizar' | 'carga-inicial';

export interface ResultadoAccionFhir {
  readonly servidor: string;
  readonly procesados?: number;
  readonly publicados?: number;
  readonly pendientes?: number;
  readonly conflictos?: number;
  readonly fallidos?: number;
  readonly bundles?: number;
  readonly recursos?: number;
}

export const FhirService = {
  async resumen(): Promise<ServiceResult<ResumenFhir>> {
    const supabase = await obtenerSupabase();
    const { data, error } = await supabase.rpc('admin_fhir_resumen');
    if (error || !data) {
      return { success: false, error: mensajeDeError(error, 'No se pudo cargar el estado de la interoperabilidad.') };
    }
    return { success: true, data: mapResumen(data) };
  },

  async ejecutar(accion: AccionFhir): Promise<ServiceResult<ResultadoAccionFhir>> {
    const supabase = await obtenerSupabase();
    const { data, error } = await supabase.functions.invoke('fhir-sync', { body: { accion } });
    if (error) {
      return { success: false, error: await mensajeDeLaFuncion(error) };
    }
    if (!data || typeof data !== 'object' || typeof (data as { servidor?: unknown }).servidor !== 'string') {
      return { success: false, error: 'El servidor FHIR no respondió como se esperaba.' };
    }
    return { success: true, data: data as ResultadoAccionFhir };
  },
} as const;

/** La función responde `{ error }` con un texto para el administrador; se muestra si existe. */
async function mensajeDeLaFuncion(error: unknown): Promise<string> {
  const contexto = (error as { context?: { json?: () => Promise<unknown> } }).context;
  try {
    const cuerpo = await contexto?.json?.();
    const mensaje = (cuerpo as { error?: unknown } | undefined)?.error;
    if (typeof mensaje === 'string' && mensaje) return mensaje;
  } catch {
    // Sin cuerpo legible: se usa el mensaje genérico.
  }
  return 'No se pudo comunicar con el servidor FHIR. Intenta de nuevo.';
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapResumen(row: any): ResumenFhir {
  return {
    estados: row.estados ?? {},
    recursos: row.recursos ?? {},
    servidor: row.servidor ?? null,
    eventos: (row.eventos ?? []).map((e: any): EventoFhir => ({
      id: e.id,
      citaId: e.cita,
      estado: e.estado,
      intentos: e.intentos ?? 0,
      creadoEn: e.creadoEn,
      procesadoEn: e.procesadoEn ?? null,
      error: e.error ?? null,
      servidor: e.servidor ?? null,
      appointment: e.appointment ?? null,
    })),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
