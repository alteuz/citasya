import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="text-center max-w-md">
        <span className="text-7xl mb-6 block" aria-hidden="true">🔎</span>
        <h1 className="text-4xl font-bold text-primary-800 mb-3">404</h1>
        <p className="text-lg text-text-secondary mb-8">
          La página que buscas no existe o fue movida.
        </p>
        <Link to="/">
          <Button variant="primary" size="lg">
            <span aria-hidden="true">←</span>
            Volver al inicio
          </Button>
        </Link>
      </div>
    </div>
  );
}
