/**
 * Cliente Supabase, cargado de forma diferida.
 *
 * @supabase/supabase-js pesa ~186 KB sin comprimir (38 % del JavaScript
 * inicial). Importarlo de forma estática obligaba a descargarlo antes de
 * pintar cualquier página, aunque la mayoría de vistas solo necesitan datos
 * después del primer pintado. Con la importación dinámica, React pinta la
 * página y el cliente se descarga en paralelo (LCP móvil, H-02).
 *
 * Solo lo consumen los servicios (src/services); los componentes nunca lo
 * importan directamente.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let cliente: Promise<SupabaseClient> | null = null;

export function obtenerSupabase(): Promise<SupabaseClient> {
  cliente ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(env.supabaseUrl, env.supabaseAnonKey),
  );
  return cliente;
}
