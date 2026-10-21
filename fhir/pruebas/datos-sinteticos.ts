/**
 * Datos sintéticos para las pruebas FHIR (Ley 1581 de 2012: ningún dato real).
 *
 * Cada llamada genera identificadores nuevos, así varias corridas contra un
 * servidor compartido, como el HAPI público de pruebas, no se pisan entre sí.
 */
import type {
  CitaFuente, EpsFuente, FranjaFuente, MedicoFuente, SedeFuente,
} from '../../supabase/functions/_shared/fhir/mapeador.ts';

export const nuevoId = (): string => crypto.randomUUID();

/** Seudónimo con la forma de un HMAC-SHA-256 (64 hexadecimales), sin derivar de nadie. */
export const seudonimoSintetico = (): string => `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');

const nitSintetico = (): string => String(Math.floor(100_000_000 + Math.random() * 899_999_999));

/** Fecha AAAA-MM-DD en Bogotá, `dias` después de hoy. */
export function fechaBogota(dias = 0): string {
  return new Date(Date.now() - 5 * 3_600_000 + dias * 86_400_000).toISOString().slice(0, 10);
}

export function epsSintetica(cambios: Partial<EpsFuente> = {}): EpsFuente {
  return {
    id: nuevoId(),
    nombre: 'EPS Sintética de Pruebas',
    nit: nitSintetico(),
    activa: true,
    codigoHabilitacion: 'EPS999',
    ...cambios,
  };
}

export function sedeSintetica(cambios: Partial<SedeFuente> = {}): SedeFuente {
  return {
    id: nuevoId(),
    codigo: String(110010000000 + Math.floor(Math.random() * 99_999)),
    nombre: 'Sede Sintética Centro',
    direccion: 'Calle 1 # 2-3 (dirección de prueba)',
    prestador: { nit: nitSintetico(), nombre: 'IPS Sintética de Pruebas' },
    ...cambios,
  };
}

export function medicoSintetico(cambios: Partial<MedicoFuente> = {}): MedicoFuente {
  return {
    id: nuevoId(),
    nombre: 'Dra. Prueba Sintética',
    registro: `SIM-T${Math.floor(Math.random() * 1_000_000)}`,
    activo: true,
    diasAtencion: [1, 2, 3, 4, 5],
    eps: epsSintetica(),
    especialidad: { id: nuevoId(), nombre: 'Medicina General' },
    sede: sedeSintetica(),
    ...cambios,
  };
}

export function franjaSintetica(fecha: string, inicio: string, fin: string, ocupada = false): FranjaFuente {
  return { id: nuevoId(), fecha, inicio, fin, ocupada };
}

export function citaSintetica(medico: MedicoFuente, franja: FranjaFuente, cambios: Partial<CitaFuente> = {}): CitaFuente {
  return {
    id: nuevoId(),
    estado: 'scheduled',
    modo: 'presencial',
    reservadaEn: '2026-10-19T20:41:00.123456+00:00',
    medico,
    franja,
    franjasAnteriores: [],
    paciente: { claveLocal: `profiles/${nuevoId()}`, seudonimo: seudonimoSintetico() },
    ...cambios,
  };
}
