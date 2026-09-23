import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from './env';

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('expone las credenciales públicas de Supabase cuando están configuradas', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://ejemplo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'clave-publica');
    expect(env.supabaseUrl).toBe('https://ejemplo.supabase.co');
    expect(env.supabaseAnonKey).toBe('clave-publica');
  });

  it.each([
    ['vacía', ''],
    ['solo espacios', '   '],
  ])('falla de forma explícita si la URL está %s', (_caso, valor) => {
    vi.stubEnv('VITE_SUPABASE_URL', valor);
    expect(() => env.supabaseUrl).toThrowError(/VITE_SUPABASE_URL/);
  });
});
