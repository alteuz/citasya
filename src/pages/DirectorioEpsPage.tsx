import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';

interface EpsDetail {
  readonly id: string;
  readonly name: string;
  readonly nit: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly active: boolean;
}

export function DirectorioEpsPage() {
  const [epsList, setEpsList] = useState<readonly EpsDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('eps')
        .select('id, name, nit, phone, email, address, active')
        .eq('active', true)
        .order('name');

      if (!error && data) {
        setEpsList(data as EpsDetail[]);
      }
      setIsLoading(false);
    }
    void load();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-primary-50 border-b border-primary-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-800 mb-2">
            Directorio de EPS 🏥
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Encuentra la información de contacto de las Entidades Promotoras de Salud afiliadas a nuestra plataforma.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height="180px" rounded="2xl" />
            ))}
          </div>
        )}

        {/* List */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {epsList.map((eps) => (
              <div
                key={eps.id}
                className="bg-surface-card border border-primary-100 rounded-2xl p-6 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-2xl shrink-0" aria-hidden="true">🏥</span>
                  <div>
                    <h2 className="text-lg font-bold text-primary-800 leading-tight">
                      {eps.name}
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">NIT: {eps.nit}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {eps.phone && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span aria-hidden="true">📞</span>
                      <a
                        href={`tel:${eps.phone}`}
                        className="hover:text-accent-500 transition-colors"
                      >
                        {eps.phone}
                      </a>
                    </div>
                  )}
                  {eps.email && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span aria-hidden="true">✉️</span>
                      <a
                        href={`mailto:${eps.email}`}
                        className="hover:text-accent-500 transition-colors break-all"
                      >
                        {eps.email}
                      </a>
                    </div>
                  )}
                  {eps.address && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span aria-hidden="true">📍</span>
                      <span>{eps.address}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && epsList.length === 0 && (
          <div className="text-center py-16 text-text-muted">
            <span className="text-5xl block mb-4" aria-hidden="true">🔍</span>
            <p className="text-lg font-medium">No se encontraron EPS activas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
