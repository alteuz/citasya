import { EnlaceBoton } from '@/components/ui/EnlaceBoton';
import { ArrowLeft, Compass } from 'lucide-react';
import { IconBadge } from '@/components/ui/IconBadge';

export function NotFoundPage() {
  return (
    <div className="relative min-h-[60vh] flex items-center justify-center px-4 py-16 animate-fade-in overflow-hidden">
      <div aria-hidden="true" className="decorativo pointer-events-none absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(88_67_252/0.25),transparent)]" />
      <div className="relative text-center max-w-md">
        <IconBadge icon={Compass} tone="brand" size="lg" className="mb-6" />
        <h1 className="texto-degradado font-display text-8xl font-extrabold tracking-[-0.05em] leading-none mb-4">404</h1>
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
