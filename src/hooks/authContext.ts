/**
 * Contexto de autenticación. Vive separado de AuthProvider para que el
 * módulo del proveedor solo exporte componentes (requisito de Fast Refresh).
 */
import { createContext } from 'react';
import type { AuthUser, RegisterInput, LoginInput } from '@/services/auth.service';
import type { Profile } from '@/types/database';

export interface AuthContextValue {
  readonly user: AuthUser | null;
  readonly profile: Profile | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly register: (input: RegisterInput) => Promise<string | null>;
  readonly login: (input: LoginInput) => Promise<string | null>;
  readonly logout: () => Promise<void>;
  readonly refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
