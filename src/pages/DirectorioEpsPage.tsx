import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { EpsService, type EpsDirectorio, type TipoRelacionRed } from '@/services/eps.service';

const REGIMEN: Record<NonNullable<EpsDirectorio['regimen']>, string> = {
  contributivo: 'Régimen contributivo',
  subsidiado: 'Régimen subsidiado',
  ambos: 'Régimen contributivo y subsidiado',
};

// El tipo de relación se muestra siempre: la simulación no afirma vínculos
// que no estén documentados (ADR-0005).
const RELACION: Record<TipoRelacionRed, string> = {
  misma_entidad: 'Red propia (misma entidad)',
  mismo_grupo: 'Red propia (mismo grupo empresarial)',
  red_publica_distrital: 'Red pública distrital',
  asignada_simulacion: 'Asignada en la simulación',
};

export function DirectorioEpsPage() {
  const { data, error, isLoading, reload } = useServiceQuery(() => EpsService.getDirectorio(), []);
  const epsList = data ?? [];
  const fuente = epsList.find((e) => e.fechaCorte)?.fuente;

  return (
    <div>
      {/* Header */}
      <div className="bg-primary-50 border-b border-primary-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-800 mb-2">
            EPS habilitadas en Bogotá
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Entidades Promotoras de Salud habilitadas en Bogotá y las sedes de atención de su red.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Esqueleto con la altura aproximada de una tarjeta con su red de sedes:
            así el pie de página no se desplaza al llegar los datos (CLS). */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height="360px" rounded="2xl" />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-surface-card border border-error/20 rounded-2xl p-8 text-center">
            <p className="text-error font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={reload} className="mt-4">Reintentar</Button>
          </div>
        )}

        {!isLoading && !error && epsList.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {epsList.map((eps) => (
              <article
                key={eps.id}
                aria-labelledby={`eps-${eps.id}`}
                className="bg-surface-card border border-primary-100 rounded-2xl p-6"
              >
                <h2 id={`eps-${eps.id}`} className="text-lg font-bold text-primary-800 leading-tight">
                  {eps.nombre}
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  NIT {eps.nit}
                  {eps.codigoHabilitacion && <> · Código {eps.codigoHabilitacion}</>}
                </p>
                {eps.regimen && <p className="text-sm text-text-secondary">{REGIMEN[eps.regimen]}</p>}

                {(eps.telefono || eps.correo || eps.direccion) && (
                  <div className="space-y-1 mt-3 text-sm text-text-secondary">
                    {eps.telefono && <p><a href={`tel:${eps.telefono}`} className="underline underline-offset-2">{eps.telefono}</a></p>}
                    {eps.correo && <p className="break-all"><a href={`mailto:${eps.correo}`} className="underline underline-offset-2">{eps.correo}</a></p>}
                    {eps.direccion && <p>{eps.direccion}</p>}
                  </div>
                )}

                {eps.sedes.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-primary-800 mt-4 mb-2">
                      Sedes de atención ({eps.sedes.length})
                    </h3>
                    {/* role="list": Safari/VoiceOver elimina la semántica de lista con list-style none. */}
                    {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
                    <ul role="list" className="space-y-2">
                      {eps.sedes.map((sede) => (
                        <li key={sede.codigoHabilitacion} className="text-sm">
                          <span className="font-medium text-text-primary">{sede.nombre}</span>
                          <span className="block text-text-secondary">{sede.direccion}</span>
                          <span className="block text-text-secondary">{RELACION[sede.tipoRelacion]}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </article>
            ))}
          </div>
        )}

        {!isLoading && !error && epsList.length === 0 && (
          <div className="text-center py-16 text-text-muted">
            <p className="text-lg font-medium">No se encontraron EPS activas.</p>
          </div>
        )}

        {fuente && !isLoading && (
          <p className="text-sm text-text-secondary mt-10 max-w-3xl">
            <strong>Fuentes:</strong> {fuente}. Sedes: Registro Especial de Prestadores de Servicios de Salud
            (REPS, MinSalud). Los profesionales y las agendas que se muestran en CitasYA son datos simulados.
          </p>
        )}
      </div>
    </div>
  );
}
