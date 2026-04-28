/**
 * AuthService — Adaptador para Supabase Auth.
 * Punto único de contacto con la API de autenticación.
 * Los componentes NUNCA importan supabase directamente.
 */
import { supabase } from '@/lib/supabase';
import type { ServiceResult } from '@/types/common';
import type { Profile } from '@/types/database';

// ─── Tipos de entrada ───────────────────────────────────────────────────────

export interface RegisterInput {
  readonly email: string;
  readonly password: string;
  readonly cedula: string;
  readonly fullName: string;
  readonly phone: string;
  readonly epsId: string;
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export interface UpdateProfileInput {
  readonly fullName?: string;
  readonly phone?: string;
}

// ─── Tipo de sesión ─────────────────────────────────────────────────────────

export interface AuthUser {
  readonly id: string;
  readonly email: string;
}

// ─── Servicio ───────────────────────────────────────────────────────────────

export const AuthService = {
  /**
   * Registra un nuevo usuario con Supabase Auth.
   * El trigger en BD crea automáticamente el perfil con la cédula y nombre.
   */
  async register(input: RegisterInput): Promise<ServiceResult<AuthUser>> {
    // 1. Verificar si la cédula ya existe (requiere la función RPC en la BD)
    const { data: cedulaExists, error: rpcError } = await supabase.rpc('check_cedula_exists', {
      p_cedula: input.cedula
    });

    if (rpcError) {
      console.error('Error verificando cédula:', rpcError);
      // Fallback silencioso: si la RPC no existe aún, procedemos normal y la BD lo manejará o fallará.
    } else if (cedulaExists) {
      return { success: false, error: 'Esta cédula ya está registrada en el sistema.' };
    }

    // 2. Crear el usuario en Auth
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          cedula: input.cedula,
          full_name: input.fullName,
        },
      },
    });

    if (error) {
      return { success: false, error: translateAuthError(error.message) };
    }

    if (!data.user) {
      return { success: false, error: 'No se pudo crear el usuario.' };
    }

    // Actualizar perfil con datos adicionales (teléfono, EPS)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        phone: input.phone,
        eps_id: input.epsId || null,
      })
      .eq('id', data.user.id);

    if (profileError) {
      console.error('Error actualizando perfil:', profileError);
      // No es fatal — el perfil se creó con el trigger
    }

    return {
      success: true,
      data: { id: data.user.id, email: data.user.email ?? '' },
    };
  },

  /**
   * Inicia sesión con email y contraseña.
   */
  async login(input: LoginInput): Promise<ServiceResult<AuthUser>> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      return { success: false, error: translateAuthError(error.message) };
    }

    if (!data.user) {
      return { success: false, error: 'No se pudo iniciar sesión.' };
    }

    return {
      success: true,
      data: { id: data.user.id, email: data.user.email ?? '' },
    };
  },

  /**
   * Cierra la sesión actual.
   */
  async logout(): Promise<ServiceResult<null>> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: 'Error al cerrar sesión.' };
    }

    return { success: true, data: null };
  },

  /**
   * Obtiene el usuario autenticado actual (si existe).
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    return { id: user.id, email: user.email ?? '' };
  },

  /**
   * Obtiene el perfil del usuario autenticado.
   */
  async getProfile(): Promise<ServiceResult<Profile>> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No hay sesión activa.' };
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*, eps:eps_id(name)')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return { success: false, error: 'No se pudo obtener el perfil.' };
    }

    return {
      success: true,
      data: mapProfileFromDb(profile),
    };
  },

  /**
   * Actualiza el perfil del usuario actual (nombre y teléfono).
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<ServiceResult<null>> {
    const updates: Record<string, string> = {};
    if (input.fullName !== undefined) updates.full_name = input.fullName;
    if (input.phone !== undefined) updates.phone = input.phone;

    if (Object.keys(updates).length === 0) return { success: true, data: null };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error actualizando perfil:', error);
      return { success: false, error: 'No se pudo actualizar el perfil.' };
    }

    return { success: true, data: null };
  },

  /**
   * Suscribirse a cambios de estado de autenticación.
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        callback({ id: session.user.id, email: session.user.email ?? '' });
      } else {
        callback(null);
      }
    });
  },
} as const;

// ─── Helpers internos ───────────────────────────────────────────────────────

function translateAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Correo o contraseña incorrectos.',
    'Email not confirmed': 'Debes confirmar tu correo electrónico antes de iniciar sesión.',
    'User already registered': 'Ya existe una cuenta con este correo.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Signup requires a valid password': 'Ingresa una contraseña válida.',
    'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos.',
  };

  return errorMap[message] ?? `Error de autenticación: ${message}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProfileFromDb(row: any): Profile {
  return {
    id: row.id,
    cedula: row.cedula ?? '',
    fullName: row.full_name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    role: row.role ?? 'patient',
    epsId: row.eps_id ?? '',
    createdAt: row.created_at ?? '',
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
