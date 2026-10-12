/**
 * AdminRoute — Protege rutas que requieren rol admin.
 * Redirige a login si no autenticado, muestra "acceso denegado" si no es admin.
 */
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthContext } from '@/hooks/useAuthContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router';
import { Lock } from 'lucide-react';
import { IconBadge } from '@/components/ui/IconBadge';

export function AdminRoute() {
  const { isAuthenticated, isLoading, profile } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8">
        <Skeleton width="200px" height="24px" rounded="lg" />
        <Skeleton width="320px" height="16px" rounded="md" />
        <p className="text-text-muted text-sm mt-4" aria-live="polite">
          Verificando permisos...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/iniciar-sesion" state={{ from: location }} replace />;
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 animate-fade-in">
        <IconBadge icon={Lock} tone="warning" size="lg" />
        <h1 className="text-2xl text-text-primary">Acceso denegado</h1>
        <p className="text-text-secondary text-center max-w-md">
          No tienes permisos de administrador para acceder a esta sección.
        </p>
        <Link to="/dashboard">
          <Button variant="primary" size="md">Ir a mi panel</Button>
        </Link>
      </div>
    );
  }

  return <Outlet />;
}
