import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useServiceQuery } from './useServiceQuery';
import type { ServiceResult } from '@/types/common';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

const ok = <T,>(data: T): ServiceResult<T> => ({ success: true, data });
const fail = (error: string): ServiceResult<never> => ({ success: false, error });

describe('useServiceQuery', () => {
  it('inicia cargando y expone los datos al resolverse', async () => {
    const { result } = renderHook(() => useServiceQuery(() => Promise.resolve(ok(['cita'])), []));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(['cita']);
    expect(result.current.error).toBeNull();
  });

  it('expone el mensaje de error del servicio', async () => {
    const { result } = renderHook(() => useServiceQuery(() => Promise.resolve(fail('Sin conexión')), []));
    await waitFor(() => expect(result.current.error).toBe('Sin conexión'));
    expect(result.current.data).toBeNull();
  });

  it('convierte una excepción en un mensaje de error y no queda cargando', async () => {
    const { result } = renderHook(() => useServiceQuery(() => Promise.reject(new Error('red')), []));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toMatch(/error inesperado/i);
  });

  it('reload limpia un error previo cuando la nueva consulta tiene éxito', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce(fail('Falla temporal'))
      .mockResolvedValueOnce(ok(3));
    const { result } = renderHook(() => useServiceQuery(query, []));
    await waitFor(() => expect(result.current.error).toBe('Falla temporal'));

    act(() => result.current.reload());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe(3));
    expect(result.current.error).toBeNull();
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('descarta una respuesta obsoleta si las dependencias cambian antes de que llegue', async () => {
    const lenta = deferred<ServiceResult<string>>();
    const rapida = deferred<ServiceResult<string>>();
    const { result, rerender } = renderHook(
      ({ filtro }) => useServiceQuery(() => (filtro === 'A' ? lenta.promise : rapida.promise), [filtro]),
      { initialProps: { filtro: 'A' } },
    );

    rerender({ filtro: 'B' });
    await act(async () => rapida.resolve(ok('resultado B')));
    await act(async () => lenta.resolve(ok('resultado A (tardío)')));

    expect(result.current.data).toBe('resultado B');
    expect(result.current.isLoading).toBe(false);
  });

  it('no consulta mientras está deshabilitado', () => {
    const query = vi.fn(() => Promise.resolve(ok(1)));
    const { result } = renderHook(() => useServiceQuery(query, [], false));
    expect(query).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});
