/**
 * Sincronizador de la outbox FHIR (ADR-0009).
 *
 * Toma los eventos pendientes, publica cada cita en un Bundle de transacción y
 * registra el resultado. No conoce Supabase ni Deno: recibe un repositorio y
 * un cliente, así la misma lógica corre en la Edge Function `fhir-sync` y en
 * las pruebas de interoperabilidad (TC-10), con un repositorio en memoria.
 *
 * Qué pasa con cada error:
 *  - Sin respuesta, 401, 403, 408, 429 o 5xx: el evento sigue pendiente y la
 *    base de datos fija el siguiente intento con espera exponencial.
 *  - 409 o 412 (versión): alguien cambió una franja en el servidor. Se leen
 *    las franjas y sus citas. Si la franja de una cita activa ya la tiene otra
 *    cita (u otro canal la bloqueó), es un conflicto real: se registra y no se
 *    sobrescribe. Si solo cambió la versión, se reintenta una vez con la
 *    versión actual, sin tocar las franjas que ahora pertenecen a otros.
 *  - Cualquier otro 4xx: fallido, con el diagnóstico del servidor.
 */
import { ErrorFhir, type ClienteFhir } from './cliente.ts';
import {
  bundleCita, bundlesMaestros, idFhir,
  type CitaFuente, type DatosMaestros, type FranjaFuente, type Versiones,
} from './mapeador.ts';
import { leerRespuestaTransaccion, type Vinculo } from './respuesta.ts';
import type { EstadoSlot, Slot } from './tipos.ts';

// ─── Contratos ──────────────────────────────────────────────────────────────

export interface EventoCita {
  /** Ids de los eventos de la outbox agrupados en esta publicación (misma cita). */
  readonly ids: readonly number[];
  readonly cita: CitaFuente;
  /** Versión de cada franja ya publicada en este servidor (id FHIR → versionId). */
  readonly versiones: Versiones;
}

export type EstadoPublicacion = 'publicado' | 'pendiente' | 'conflicto' | 'fallido';

export interface ResultadoPublicacion {
  readonly estado: EstadoPublicacion;
  readonly vinculos: readonly Vinculo[];
  readonly error?: string;
}

export interface RepositorioOutbox {
  tomarEventos(limite: number): Promise<readonly EventoCita[]>;
  registrar(evento: EventoCita, resultado: ResultadoPublicacion): Promise<void>;
}

export interface ResumenLote {
  procesados: number;
  publicados: number;
  pendientes: number;
  conflictos: number;
  fallidos: number;
}

export const resumenVacio = (): ResumenLote => ({ procesados: 0, publicados: 0, pendientes: 0, conflictos: 0, fallidos: 0 });

// ─── Clasificación de errores ───────────────────────────────────────────────

export type ClaseDeError = 'reintentar' | 'version' | 'definitivo';

export function clasificarError(error: unknown): ClaseDeError {
  if (!(error instanceof ErrorFhir)) return 'definitivo';
  const { status } = error;
  if (status === 0 || status === 401 || status === 403 || status === 408 || status === 429 || status >= 500) {
    return 'reintentar';
  }
  // HAPI responde 409 (HAPI-0989) ante un If-Match desactualizado; la especificación permite 412.
  if (status === 409 || status === 412) return 'version';
  return 'definitivo';
}

const describir = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const esActiva = (cita: CitaFuente): boolean => cita.estado === 'scheduled' || cita.estado === 'rescheduled';

/** Estados en los que el servidor considera la franja tomada. */
const OCUPADA: ReadonlySet<EstadoSlot> = new Set(['busy', 'busy-unavailable', 'busy-tentative']);

// ─── Revisión tras un conflicto de versión ──────────────────────────────────

interface FranjaEnServidor {
  readonly version?: string;
  readonly estado?: EstadoSlot;
  /** Otra cita activa en el servidor que usa la franja. */
  readonly citaAjena?: string;
  /** La propia cita ya figura en el servidor con esta franja. */
  readonly citaPropia: boolean;
}

async function revisarFranja(cliente: ClienteFhir, horario: FranjaFuente, idCita: string): Promise<FranjaEnServidor> {
  const id = idFhir.franja(horario.id);
  let version: string | undefined;
  let estado: EstadoSlot | undefined;
  try {
    const actual = await cliente.leer<Slot>('Slot', id);
    version = actual.meta?.versionId;
    estado = actual.status;
  } catch (error) {
    // 404/410: la franja no está en el servidor (p. ej., se depuró); se vuelve a crear sin If-Match.
    if (!(error instanceof ErrorFhir && (error.status === 404 || error.status === 410))) throw error;
  }
  const citas = await cliente.buscar('Appointment', {
    slot: `Slot/${id}`,
    status: 'booked,arrived,checked-in',
    _count: '20',
  });
  const ids = (citas.entry ?? []).map((e) => e.resource?.id).filter((x): x is string => typeof x === 'string');
  const propia = idFhir.cita(idCita);
  const ajena = ids.find((x) => x !== propia);
  return {
    ...(version ? { version } : {}),
    ...(estado ? { estado } : {}),
    ...(ajena ? { citaAjena: ajena } : {}),
    citaPropia: ids.includes(propia),
  };
}

const tomadaPorOtro = (franja: FranjaEnServidor | undefined): boolean =>
  franja !== undefined
  && (franja.citaAjena !== undefined || (franja.estado !== undefined && OCUPADA.has(franja.estado) && !franja.citaPropia));

// ─── Publicación ────────────────────────────────────────────────────────────

/** Publica una cita en un Bundle de transacción y devuelve qué registrar en la outbox. */
export async function publicarCita(cliente: ClienteFhir, evento: EventoCita, hoy: string): Promise<ResultadoPublicacion> {
  const { cita } = evento;
  let versiones: Versiones = evento.versiones;
  let omitir: ReadonlySet<string> = new Set();

  for (let intento = 1; ; intento++) {
    const { bundle, esperadas } = bundleCita(cita, { hoy, versiones, omitirFranjas: omitir });
    let respuesta;
    try {
      respuesta = await cliente.transaccion(bundle);
    } catch (error) {
      const clase = clasificarError(error);
      if (clase === 'reintentar') return { estado: 'pendiente', vinculos: [], error: describir(error) };
      if (clase === 'definitivo') return { estado: 'fallido', vinculos: [], error: describir(error) };
      if (intento >= 2) {
        return { estado: 'pendiente', vinculos: [], error: `El conflicto de versión persiste: ${describir(error)}` };
      }

      const revision = new Map<string, FranjaEnServidor>();
      try {
        for (const horario of [...cita.franjasAnteriores.filter((f) => f.id !== cita.franja.id), cita.franja]) {
          revision.set(horario.id, await revisarFranja(cliente, horario, cita.id));
        }
      } catch (fallo) {
        return { estado: 'pendiente', vinculos: [], error: describir(fallo) };
      }

      const actual = revision.get(cita.franja.id);
      if (esActiva(cita) && tomadaPorOtro(actual)) {
        const quien = actual?.citaAjena ? `Appointment/${actual.citaAjena}` : `otro canal (estado ${actual?.estado ?? 'desconocido'})`;
        return {
          estado: 'conflicto',
          vinculos: [],
          error: `La franja ${idFhir.franja(cita.franja.id)} ya está tomada en el servidor FHIR por ${quien}. `
            + 'No se sobrescribió: la cita queda para revisión.',
        };
      }

      // Las franjas que se liberan y que ahora usa otra cita (u otro canal) no se tocan.
      const siguientesOmitidas = new Set<string>();
      const siguientesVersiones: Record<string, string> = {};
      for (const [idLocal, enServidor] of revision) {
        const esLaActual = idLocal === cita.franja.id && esActiva(cita);
        if (!esLaActual && tomadaPorOtro(enServidor)) siguientesOmitidas.add(idLocal);
        if (enServidor.version) siguientesVersiones[idFhir.franja(idLocal)] = enServidor.version;
      }
      omitir = siguientesOmitidas;
      versiones = siguientesVersiones;
      continue;
    }

    try {
      return { estado: 'publicado', vinculos: leerRespuestaTransaccion(respuesta, esperadas) };
    } catch (error) {
      return { estado: 'fallido', vinculos: [], error: describir(error) };
    }
  }
}

/** Procesa un lote de la outbox, cita por cita y en orden, y devuelve el resumen. */
export async function procesarLote(opciones: {
  readonly repositorio: RepositorioOutbox;
  readonly cliente: ClienteFhir;
  readonly hoy: string;
  readonly limite?: number;
}): Promise<ResumenLote> {
  const resumen = resumenVacio();
  const eventos = await opciones.repositorio.tomarEventos(opciones.limite ?? 10);
  for (const evento of eventos) {
    const resultado = await publicarCita(opciones.cliente, evento, opciones.hoy);
    await opciones.repositorio.registrar(evento, resultado);
    resumen.procesados += 1;
    if (resultado.estado === 'publicado') resumen.publicados += 1;
    else if (resultado.estado === 'pendiente') resumen.pendientes += 1;
    else if (resultado.estado === 'conflicto') resumen.conflictos += 1;
    else resumen.fallidos += 1;
  }
  return resumen;
}

/** Carga inicial de los recursos maestros (TC-02). Los errores se propagan a quien la invoca. */
export async function cargarMaestros(
  cliente: ClienteFhir,
  datos: DatosMaestros,
  hoy: string,
  tamano = 100,
): Promise<{ readonly bundles: number; readonly vinculos: readonly Vinculo[] }> {
  const preparados = bundlesMaestros(datos, hoy, tamano);
  const vinculos: Vinculo[] = [];
  for (const { bundle, esperadas } of preparados) {
    vinculos.push(...leerRespuestaTransaccion(await cliente.transaccion(bundle), esperadas));
  }
  return { bundles: preparados.length, vinculos };
}
