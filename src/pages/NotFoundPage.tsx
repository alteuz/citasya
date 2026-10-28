import { EnlaceBoton } from '@/components/ui/EnlaceBoton';
import { ArrowLeft, Compass } from 'lucide-react';
import { IconBadge } from '@/components/ui/IconBadge';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="text-center max-w-md">
        <IconBadge icon={Compass} tone="brand" size="lg" className="mb-6" />
        <h1 className="text-4xl text-text-primary mb-3">404</h1>
        <p className="text-lg text-text-secondary mb-8">
          La página que buscas no existe o fue movida.
        </p>
        <EnlaceBoton to="/" variant="primary" size="lg">
          <ArrowLeft size={16} aria-hidden="true" />
          Volver al inicio
        </EnlaceBoton>
      </div>
    </div>
  );
}
