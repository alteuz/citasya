/**
 * Lectura de la respuesta de una transacción FHIR (ADR-0009).
 *
 * El servidor responde un Bundle `transaction-response` con una entrada por
 * cada entrada enviada y en el mismo orden. De cada una se obtiene el id
 * lógico y la versión del recurso (de `location` y `etag`), que se guardan en
 * `fhir_vinculos` para la siguiente publicación con `If-Match`.
 */
import type { Bundle, OperationOutcome, TipoRecurso } from './tipos.ts';
import type { EntradaEsperada } from './mapeador.ts';

export interface Vinculo {
  readonly recurso: TipoRecurso;
  readonly claveLocal: string;
  readonly idFhir: string;
  readonly version: string;
}

/** `Slot/abc/_history/3` o `https://servidor/fhir/Slot/abc/_history/3`. */
const PATRON_LOCATION = /(?:^|\/)([A-Z][A-Za-z]+)\/([A-Za-z0-9\-.]{1,64})\/_history\/([A-Za-z0-9\-.]{1,64})$/;

/** Versión de un ETag débil (`W/"3"`) o fuerte (`"3"`). */
export function versionDeEtag(etag: string | undefined): string | undefined {
  const coincidencia = /^(?:W\/)?"([^"]+)"$/.exec(etag ?? '');
  return coincidencia?.[1];
}

export function leerRespuestaTransaccion(respuesta: Bundle, esperadas: readonly EntradaEsperada[]): Vinculo[] {
  if (respuesta?.resourceType !== 'Bundle' || respuesta.type !== 'transaction-response') {
    throw new Error('El servidor FHIR no devolvió un Bundle de tipo transaction-response.');
  }
  const entradas = respuesta.entry ?? [];
  if (entradas.length !== esperadas.length) {
    throw new Error(`La respuesta tiene ${entradas.length} entradas y se enviaron ${esperadas.length}.`);
  }
  return esperadas.map((esperada, i) => {
    const resultado = entradas[i]?.response;
    if (!resultado || !/^20[01]\b/.test(resultado.status)) {
      throw new Error(`La entrada ${i + 1} (${esperada.recurso}) no se aplicó: ${resultado?.status ?? 'sin estado'}.`);
    }
    const partes = PATRON_LOCATION.exec(resultado.location ?? '');
    if (!partes || partes[1] !== esperada.recurso) {
      throw new Error(`La entrada ${i + 1} (${esperada.recurso}) no trae una ubicación válida: «${resultado.location ?? ''}».`);
    }
    return {
      recurso: esperada.recurso,
      claveLocal: esperada.claveLocal,
      idFhir: partes[2] ?? '',
      version: versionDeEtag(resultado.etag) ?? partes[3] ?? '',
    };
  });
}

/** Texto breve con los problemas graves de un OperationOutcome. */
export function resumirResultado(resultado: OperationOutcome | undefined): string | undefined {
  const problemas = (resultado?.issue ?? [])
    .filter((p) => p.severity === 'error' || p.severity === 'fatal')
    .map((p) => p.diagnostics ?? p.code);
  return problemas.length > 0 ? problemas.join(' · ') : undefined;
}
