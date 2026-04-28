/**
 * ProtectedRoute — Redirige a login si el usuario no está autenticado.
 * Muestra skeleton mientras se verifica el estado de auth.
 */
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthContext } from '@/hooks/useAuthContext';
import { Skeleton } from '@/components/ui/Skeleton';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8">
        <Skeleton width="200px" height="24px" rounded="lg" />
        <Skeleton width="320px" height="16px" rounded="md" />
        <Skeleton width="280px" height="16px" rounded="md" />
        <p className="text-text-muted text-sm mt-4" aria-live="polite">
          Verificando sesión...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Guardar la ruta destino para redirigir después del login
    return <Navigate to="/iniciar-sesion" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
