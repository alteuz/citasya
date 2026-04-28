/**
 * useAuth — Hook para acceder al contexto de autenticación.
 * Falla ruidosamente si se usa fuera del AuthProvider.
 */
import { useContext } from 'react';
import { AuthContext } from './useAuth';

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuthContext debe usarse dentro de un <AuthProvider>. ' +
      'Asegúrate de envolver tu aplicación con <AuthProvider>.'
    );
  }

  return context;
}
