import { useCallback, useEffect, useState, type DependencyList } from 'react';
import type { ServiceResult } from '@/types/common';

interface Settled<T> {
  readonly key: readonly unknown[];
  readonly data: T | null;
  readonly error: string | null;
}

export interface ServiceQuery<T> {
  readonly data: T | null;
  readonly error: string | null;
  readonly isLoading: boolean;
  /** Vuelve a ejecutar la consulta (p. ej., después de cancelar una cita). */
  readonly reload: () => void;
}

const sameKey = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((value, i) => Object.is(value, b[i]));

/**
 * Ejecuta una consulta de servicio y expone datos, error y estado de carga.
 *
 * - El estado solo se actualiza cuando la promesa se resuelve (nunca de forma
 *   síncrona dentro del efecto), lo que evita renders en cascada.
 * - Si las dependencias cambian antes de que llegue la respuesta, esa
 *   respuesta se descarta: no hay condiciones de carrera entre búsquedas.
 * - `isLoading` se deriva comparando las dependencias actuales con las de la
 *   última respuesta recibida, en lugar de mantener otro estado sincronizado.
 * - Con `enabled = false` no se consulta y se informa como no cargando.
 */
export function useServiceQuery<T>(
  query: () => Promise<ServiceResult<T>>,
  deps: DependencyList,
  enabled = true,
): ServiceQuery<T> {
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const key = [...deps, version];

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    query()
      .then((result) => {
        if (!active) return;
        setSettled(
          result.success
            ? { key, data: result.data, error: null }
            : { key, data: null, error: result.error },
        );
      })
      .catch(() => {
        if (!active) return;
        setSettled({ key, data: null, error: 'Ocurrió un error inesperado. Intenta de nuevo.' });
      });
    return () => {
      active = false;
    };
    // `query` se recrea en cada render; las dependencias reales son `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version, enabled]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const isCurrent = settled !== null && sameKey(settled.key, key);

  return {
    data: settled?.data ?? null,
    error: isCurrent ? settled.error : null,
    isLoading: enabled && !isCurrent,
    reload,
  };
}
