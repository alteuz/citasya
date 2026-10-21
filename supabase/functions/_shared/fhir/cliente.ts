/**
 * Cliente REST mínimo de HL7 FHIR R4 (ADR-0009).
 *
 * Usa solo `fetch`, `AbortController` y `URLSearchParams`, que existen en
 * Deno (Edge Function) y en Node 22 (pruebas), así que el mismo código corre
 * en ambos. Cada fallo se convierte en `ErrorFhir` con el estado HTTP (0 si
 * no hubo respuesta), que el sincronizador usa para decidir si reintenta.
 */
import type { Bundle, CapabilityStatement, OperationOutcome, RecursoClinico, TipoRecurso } from './tipos.ts';
import { resumirResultado } from './respuesta.ts';

export class ErrorFhir extends Error {
  /** Estado HTTP de la respuesta; 0 si el servidor no respondió (red o tiempo agotado). */
  readonly status: number;
  readonly resultado: OperationOutcome | undefined;

  constructor(mensaje: string, status: number, resultado?: OperationOutcome) {
    super(mensaje);
    this.name = 'ErrorFhir';
    this.status = status;
    this.resultado = resultado;
  }
}

export interface OpcionesCliente {
  /** Base del servidor, p. ej. `https://hapi.fhir.org/baseR4` o `http://localhost:8080/fhir`. */
  readonly base: string;
  /** Token Bearer, si el servidor lo exige (secreto de la función, nunca del navegador). */
  readonly token?: string;
  readonly tiempoMaximoMs?: number;
  readonly fetch?: typeof fetch;
}

export interface ClienteFhir {
  readonly base: string;
  capacidades(): Promise<CapabilityStatement>;
  transaccion(bundle: Bundle): Promise<Bundle>;
  leer<T extends RecursoClinico>(tipo: T['resourceType'], id: string): Promise<T>;
  buscar(tipo: TipoRecurso, parametros: Readonly<Record<string, string>>): Promise<Bundle>;
  validar(recurso: RecursoClinico): Promise<OperationOutcome>;
}

const TIEMPO_MAXIMO_MS = 20_000;

function esOperationOutcome(valor: unknown): valor is OperationOutcome {
  return typeof valor === 'object' && valor !== null && (valor as { resourceType?: unknown }).resourceType === 'OperationOutcome';
}

/** Mensaje del error con su causa de red, si la hay (p. ej. «fetch failed (ECONNRESET)»). */
function describir(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const causa = (error as { cause?: { code?: unknown; message?: unknown } }).cause;
  const detalle = typeof causa?.code === 'string' ? causa.code : typeof causa?.message === 'string' ? causa.message : '';
  return detalle ? `${error.message} (${detalle})` : error.message;
}

export function crearClienteFhir(opciones: OpcionesCliente): ClienteFhir {
  const base = opciones.base.replace(/\/+$/, '');
  const hacerFetch: typeof fetch = opciones.fetch ?? ((entrada, init) => fetch(entrada, init));

  async function pedir<T>(metodo: 'GET' | 'POST', ruta: string, cuerpo?: unknown, encabezados?: Record<string, string>): Promise<T> {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), opciones.tiempoMaximoMs ?? TIEMPO_MAXIMO_MS);
    let estado: number;
    let correcto: boolean;
    let texto: string;
    try {
      const respuesta = await hacerFetch(ruta ? `${base}/${ruta}` : base, {
        method: metodo,
        headers: {
          Accept: 'application/fhir+json',
          ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/fhir+json' }),
          ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}),
          ...encabezados,
        },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        signal: control.signal,
      });
      estado = respuesta.status;
      correcto = respuesta.ok;
      texto = await respuesta.text();
    } catch (error) {
      throw new ErrorFhir(`Sin respuesta del servidor FHIR (${base}): ${describir(error)}`, 0);
    } finally {
      clearTimeout(temporizador);
    }

    let json: unknown;
    try {
      json = texto ? JSON.parse(texto) : undefined;
    } catch {
      json = undefined;
    }
    if (!correcto) {
      const resultado = esOperationOutcome(json) ? json : undefined;
      const detalle = resumirResultado(resultado) ?? texto.slice(0, 300);
      throw new ErrorFhir(`El servidor FHIR respondió ${estado}: ${detalle}`, estado, resultado);
    }
    return json as T;
  }

  return {
    base,
    capacidades: () => pedir<CapabilityStatement>('GET', 'metadata'),
    // `return=minimal`: basta con el estado, la ubicación y el ETag de cada entrada.
    transaccion: (bundle) => pedir<Bundle>('POST', '', bundle, { Prefer: 'return=minimal' }),
    leer: <T extends RecursoClinico>(tipo: T['resourceType'], id: string) =>
      pedir<T>('GET', `${tipo}/${encodeURIComponent(id)}`),
    buscar: (tipo, parametros) => pedir<Bundle>('GET', `${tipo}?${new URLSearchParams(parametros).toString()}`),
    async validar(recurso) {
      try {
        return await pedir<OperationOutcome>('POST', `${recurso.resourceType}/$validate`, recurso);
      } catch (error) {
        // Algunos servidores responden 4xx cuando el recurso no es válido: el resultado sigue siendo el OperationOutcome.
        if (error instanceof ErrorFhir && error.resultado) return error.resultado;
        throw error;
      }
    },
  };
}
