/**
 * AuthContext — Estado global de autenticación.
 * Provee usuario actual, perfil, y funciones de auth a toda la app.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthService, type AuthUser, type RegisterInput, type LoginInput } from '@/services/auth.service';
import type { Profile } from '@/types/database';
import { AuthContext, type AuthContextValue } from './authContext';

// ─── Provider ───────────────────────────────────────────────────────────────

interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar perfil del usuario autenticado
  const loadProfile = useCallback(async () => {
    const result = await AuthService.getProfile();
    if (result.success) {
      setProfile(result.data);
    } else {
      setProfile(null);
    }
  }, []);

  // Inicializar: obtener usuario actual y suscribirse a cambios
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const currentUser = await AuthService.getCurrentUser();
      if (!isMounted) return;

      setUser(currentUser);
      if (currentUser) {
        await loadProfile();
      }
      setIsLoading(false);
    }

    void init();

    // La suscripción se resuelve cuando termina de cargar el cliente diferido.
    let cancelarSuscripcion: (() => void) | undefined;
    void AuthService.onAuthStateChange(async (authUser) => {
      if (!isMounted) return;

      setUser(authUser);
      if (authUser) {
        await loadProfile();
      } else {
        setProfile(null);
      }
    }).then((cancelar) => {
      if (isMounted) cancelarSuscripcion = cancelar;
      else cancelar();
    });

    return () => {
      isMounted = false;
      cancelarSuscripcion?.();
    };
  }, [loadProfile]);

  // Registrar
  const register = useCallback(async (input: RegisterInput): Promise<string | null> => {
    const result = await AuthService.register(input);
    if (!result.success) return result.error;
    setUser(result.data);
    // Perfil se carga automáticamente vía onAuthStateChange
    return null;
  }, []);

  // Login
  const login = useCallback(async (input: LoginInput): Promise<string | null> => {
    const result = await AuthService.login(input);
    if (!result.success) return result.error;
    setUser(result.data);
    return null;
  }, []);

  // Logout
  const logout = useCallback(async () => {
    await AuthService.logout();
    setUser(null);
    setProfile(null);
  }, []);

  // Refrescar perfil
  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isLoading,
      isAuthenticated: user !== null,
      register,
      login,
      logout,
      refreshProfile,
    }),
    [user, profile, isLoading, register, login, logout, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
