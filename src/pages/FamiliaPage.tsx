import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, CalendarPlus, Pencil, Plus, Trash2, TriangleAlert, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { estilosBoton } from '@/components/ui/estilosBoton';
import { IconBadge } from '@/components/ui/IconBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { FormularioFamiliar } from '@/components/familia/FormularioFamiliar';
import { useAuthContext } from '@/hooks/useAuthContext';
import { useAhora } from '@/hooks/useAhora';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { DoctorsService } from '@/services/doctors.service';
import { FamiliaService } from '@/services/familia.service';
import { MAX_FAMILIARES, edadEnAnios, etiquetaParentesco, etiquetaTipoDocumento } from '@/lib/familia';
import type { Familiar } from '@/types/database';

type Edicion = { readonly modo: 'nuevo' } | { readonly modo: 'editar'; readonly familiar: Familiar } | null;

/** «Mi familia»: personas a cargo del titular, con acceso directo para pedirles cita (RF-13). */
export function FamiliaPage() {
  const { profile } = useAuthContext();
  const { data, error, isLoading, reload } = useServiceQuery(() => FamiliaService.listar(), []);
  const { data: listaEps } = useServiceQuery(() => DoctorsService.getEpsList(), []);
  const ahora = useAhora();
  const familiares: readonly Familiar[] = data ?? [];
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [retirandoId, setRetirandoId] = useState<string | null>(null);
  const lleno = familiares.length >= MAX_FAMILIARES;

  const abrir = (siguiente: Edicion) => {
    setAviso(null);
    setErrorAccion(null);
    setEdicion(siguiente);
  };

  const alGuardar = useCallback((nombre: string) => {
    setAviso(edicion?.modo === 'nuevo' ? `Registramos a ${nombre} en tu familia.` : `Actualizamos los datos de ${nombre}.`);
    setEdicion(null);
    reload();
  }, [edicion, reload]);

  const retirar = useCallback(async (familiar: Familiar) => {
    if (!window.confirm(`¿Retirar a ${familiar.nombreCompleto} de tu familia? Su historial de citas se conserva.`)) return;
    setRetirandoId(familiar.id);
    setAviso(null);
    setErrorAccion(null);
    const resultado = await FamiliaService.retirar(familiar.id);
    setRetirandoId(null);
    if (!resultado.success) {
      setErrorAccion(resultado.error);
      return;
    }
    setAviso(`${familiar.nombreCompleto} ya no está en tu familia.`);
    reload();
  }, [reload]);

  return (
    <div className="animate-fade-in">
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 min-h-11 -ml-1 px-1 rounded-lg text-sm text-text-muted hover:text-text-primary font-medium mb-3"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Volver al panel
          </Link>
          <h1 className="text-2xl md:text-3xl text-text-primary">Mi familia</h1>
          <p className="text-text-secondary mt-1 max-w-2xl">
            Registra a las personas a tu cargo, como tus hijos o tus padres, y pide sus citas desde tu cuenta.
            Cada persona puede tener su propia EPS.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {aviso && (
          <p role="status" className="px-4 py-3 bg-success-soft text-success text-sm font-medium rounded-xl border border-success/30">
            {aviso}
          </p>
        )}
        {errorAccion && (
          <p role="alert" className="px-4 py-3 bg-error-soft text-error text-sm font-medium rounded-xl border border-error/30">
            {errorAccion}
          </p>
        )}

        {edicion ? (
          <FormularioFamiliar
            key={edicion.modo === 'editar' ? edicion.familiar.id : 'nuevo'}
            familiar={edicion.modo === 'editar' ? edicion.familiar : undefined}
            epsTitular={profile?.epsId ?? ''}
            listaEps={listaEps ?? []}
            onGuardado={alGuardar}
            onCancelar={() => setEdicion(null)}
          />
        ) : (
          !isLoading && !error && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Button variant="primary" size="md" onClick={() => abrir({ modo: 'nuevo' })} disabled={lleno}>
                <Plus size={18} aria-hidden="true" /> Agregar familiar
              </Button>
              {lleno && (
                <p className="text-sm text-text-secondary">Ya registraste el máximo de {MAX_FAMILIARES} familiares.</p>
              )}
            </div>
          )
        )}

        {isLoading && (
          <div className="space-y-4">
            <Skeleton height="150px" rounded="2xl" />
            <Skeleton height="150px" rounded="2xl" />
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-error-soft border border-error/30 rounded-2xl p-8 text-center">
            <IconBadge icon={TriangleAlert} tone="error" size="md" className="mb-4" />
            <p className="text-error font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={reload} className="mt-4">
              Reintentar
            </Button>
          </div>
        )}

        {!isLoading && !error && familiares.length === 0 && !edicion && (
          <div className="bg-surface-card border border-line rounded-2xl p-10 text-center">
            <IconBadge icon={Users} size="lg" className="mb-5" />
            <h2 className="font-sans text-lg font-semibold text-text-primary mb-2">Aún no has registrado familiares</h2>
            <p className="text-text-secondary max-w-md mx-auto">
              Cuando registres a alguien, podrás pedirle una cita con un solo botón, aunque su EPS sea distinta a la tuya.
            </p>
          </div>
        )}

        {!isLoading && !error && familiares.length > 0 && (
          <section aria-labelledby="familiares-heading">
            <h2 id="familiares-heading" className="font-sans text-xl font-semibold text-text-primary mb-4">
              Tus familiares <span className="text-text-muted font-normal">({familiares.length})</span>
            </h2>
            <ul className="space-y-4">
              {familiares.map((familiar) => (
                <li key={familiar.id} className="bg-surface-card border border-line rounded-2xl p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-text-primary">{familiar.nombreCompleto}</h3>
                      <p className="text-sm text-accent font-medium">
                        {etiquetaParentesco(familiar.parentesco)} · {edadEnAnios(familiar.fechaNacimiento, ahora)} años
                      </p>
                      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div>
                          <dt className="text-text-muted">EPS</dt>
                          <dd className="text-text-primary font-medium">{familiar.epsName}</dd>
                        </div>
                        <div>
                          <dt className="text-text-muted">Documento</dt>
                          <dd className="text-text-primary font-medium">
                            {etiquetaTipoDocumento(familiar.tipoDocumento)} {familiar.numeroDocumento}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end shrink-0">
                      <Link
                        to={`/buscar?para=${familiar.id}`}
                        className={estilosBoton({ variant: 'primary', size: 'sm' })}
                        aria-label={`Pedir cita para ${familiar.nombreCompleto}`}
                      >
                        <CalendarPlus size={16} aria-hidden="true" /> Pedir cita
                      </Link>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => abrir({ modo: 'editar', familiar })}
                          aria-label={`Editar los datos de ${familiar.nombreCompleto}`}
                        >
                          <Pencil size={16} aria-hidden="true" /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={retirandoId === familiar.id}
                          onClick={() => { void retirar(familiar); }}
                          aria-label={`Retirar a ${familiar.nombreCompleto}`}
                        >
                          <Trash2 size={16} aria-hidden="true" /> Retirar
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
