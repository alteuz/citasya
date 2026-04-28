/**
 * Cliente Supabase singleton.
 * NOTA: En Phase 1 el cliente se crea pero no se usa activamente.
 * En fases posteriores se consumirá SOLO a través de servicios/adapters,
 * nunca directamente desde componentes UI.
 */
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
