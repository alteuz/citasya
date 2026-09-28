/**
 * EpsService — Directorio de EPS habilitadas y su red de sedes (datos reales
 * con procedencia, ADR-0005). Los componentes NUNCA importan supabase.
 */
import { obtenerSupabase } from '@/lib/supabase';
import type { ServiceResult } from '@/types/common';

export type TipoRelacionRed = 'misma_entidad' | 'mismo_grupo' | 'red_publica_distrital' | 'asignada_simulacion';

export interface SedeDeRed {
  readonly nombre: string;
  readonly direccion: string;
  readonly codigoHabilitacion: string;
  readonly tipoRelacion: TipoRelacionRed;
}

export interface EpsDirectorio {
  readonly id: string;
  readonly nombre: string;
  readonly nit: string;
  readonly codigoHabilitacion: string | null;
  readonly regimen: 'contributivo' | 'subsidiado' | 'ambos' | null;
  readonly telefono: string;
  readonly correo: string;
  readonly direccion: string;
  readonly fuente: string;
  readonly fechaCorte: string | null;
  readonly sedes: readonly SedeDeRed[];
}

interface FilaEps {
  id: string;
  name: string;
  nit: string;
  codigo_habilitacion: string | null;
  regimen: EpsDirectorio['regimen'];
  phone: string;
  email: string;
  address: string;
  fuente: string;
  fecha_corte: string | null;
  eps_red_sedes: {
    tipo_relacion: TipoRelacionRed;
    ips_sedes: { nombre_sede: string; direccion: string; codigo_habilitacion_sede: string } | null;
  }[];
}

export const EpsService = {
  /** EPS activas con su red de sedes (REPS), ordenadas por nombre. */
  async getDirectorio(): Promise<ServiceResult<readonly EpsDirectorio[]>> {
    const supabase = await obtenerSupabase();
    const { data, error } = await supabase
      .from('eps')
      .select('id, name, nit, codigo_habilitacion, regimen, phone, email, address, fuente, fecha_corte, eps_red_sedes(tipo_relacion, ips_sedes(nombre_sede, direccion, codigo_habilitacion_sede))')
      .eq('active', true)
      .order('name')
      .returns<FilaEps[]>();

    if (error) {
      return { success: false, error: 'No se pudo cargar el directorio de EPS.' };
    }

    return {
      success: true,
      data: data.map((e) => ({
        id: e.id,
        nombre: e.name,
        nit: e.nit,
        codigoHabilitacion: e.codigo_habilitacion,
        regimen: e.regimen,
        telefono: e.phone,
        correo: e.email,
        direccion: e.address,
        fuente: e.fuente,
        fechaCorte: e.fecha_corte,
        sedes: e.eps_red_sedes.flatMap((r) =>
          r.ips_sedes
            ? [{
                nombre: r.ips_sedes.nombre_sede,
                direccion: r.ips_sedes.direccion,
                codigoHabilitacion: r.ips_sedes.codigo_habilitacion_sede,
                tipoRelacion: r.tipo_relacion,
              }]
            : [],
        ),
      })),
    };
  },
} as const;
