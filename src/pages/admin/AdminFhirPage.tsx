import { useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft, CircleCheck, CircleX, Clock, ExternalLink, RefreshCw, Server, TriangleAlert, Upload, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { IconBadge } from '@/components/ui/IconBadge';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import {
  FhirService, type AccionFhir, type EstadoEventoFhir, type EventoFhir, type ResultadoAccionFhir,
} from '@/services/fhir.service';

/** Cada estado con texto e ícono propios: el color nunca es la única señal. */
const ESTADOS: Record<EstadoEventoFhir, { label: string; icon: LucideIcon; className: string }> = {
  pendiente: { label: 'Pendiente', icon: Clock, className: 'bg-warning-soft text-warning border border-warning/30' },
  procesando: { label: 'Publicando', icon: RefreshCw, className: 'bg-info-soft text-info border border-info/30' },
  publicado: { label: 'Publicada', icon: CircleCheck, className: 'bg-success-soft text-success border border-success/30' },
  conflicto: { label: 'En conflicto', icon: TriangleAlert, className: 'bg-error-soft text-error border border-error/30' },
  fallido: { label: 'Fallida', icon: CircleX, className: 'bg-error-soft text-error border border-error/30' },
};

const RECURSOS = ['Organization', 'Location', 'Practitioner', 'PractitionerRole', 'Schedule', 'Slot', 'Patient', 'Appointment'] as const;

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });
const formatearFecha = (iso: string | null) => (iso ? FORMATO_FECHA.format(new Date(iso)) : '—');

function describirResultado(accion: AccionFhir, resultado: ResultadoAccionFhir): string {
  if (accion === 'carga-inicial') {
    return `Se publicaron ${resultado.recursos ?? 0} recursos maestros en ${resultado.bundles ?? 0} transacciones.`;
  }
  const procesadas = resultado.procesados ?? 0;
  if (procesadas === 0) return 'No había citas por publicar: todo está al día.';
  return `Se procesaron ${procesadas} citas: ${resultado.publicados ?? 0} publicadas, ${resultado.pendientes ?? 0} pendientes, `
    + `${resultado.conflictos ?? 0} en conflicto y ${resultado.fallidos ?? 0} fallidas.`;
}

export function AdminFhirPage() {
  const { data, error, isLoading, reload } = useServiceQuery(() => FhirService.resumen(), []);
  const [ejecutando, setEjecutando] = useState<AccionFhir | null>(null);
  const [aviso, setAviso] = useState('');
  const [fallo, setFallo] = useState<string | null>(null);

  async function ejecutar(accion: AccionFhir) {
    setEjecutando(accion);
    setAviso('');
    setFallo(null);
    const resultado = await FhirService.ejecutar(accion);
    setEjecutando(null);
    if (resultado.success) {
      setAviso(describirResultado(accion, resultado.data));
      reload();
    } else {
      setFallo(resultado.error);
    }
  }

  const estados = data?.estados ?? {};

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/admin" className="inline-flex items-center gap-1 min-h-11 -ml-1 px-1 rounded-lg text-sm text-text-muted hover:text-text-primary font-medium mb-3">
            <ArrowLeft size={16} aria-hidden="true" /> Volver al panel
          </Link>
          <h1 className="text-2xl md:text-3xl text-text-primary">Interoperabilidad HL7 FHIR</h1>
          <p className="text-text-secondary mt-1 max-w-3xl text-pretty">
            Cada vez que se reserva, cancela o reprograma una cita, CitasYA la publica en el servidor FHIR que
            representa a la EPS. El paciente viaja con un seudónimo: ningún dato personal sale de la plataforma.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {!data && isLoading && (
          <div className="space-y-4">
            <Skeleton height="140px" rounded="xl" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} height="100px" rounded="xl" />)}
            </div>
          </div>
        )}

        {error && !data && !isLoading && (
          <div className="bg-error-soft border border-error/30 rounded-2xl p-8 text-center">
            <p className="text-error font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={reload} className="mt-4">Reintentar</Button>
          </div>
        )}

        {data && (
          <>
            <section aria-labelledby="titulo-servidor" className="bg-surface-card border border-line rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <IconBadge icon={Server} tone="brand" size="sm" />
                <div className="min-w-0">
                  <h2 id="titulo-servidor" className="font-sans text-lg font-semibold text-text-primary">Servidor FHIR</h2>
                  {data.servidor ? (
                    <a
                      href={`${data.servidor}/metadata`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 min-h-11 text-sm font-medium text-link underline underline-offset-2 break-all"
                    >
                      {data.servidor}
                      <ExternalLink size={14} aria-hidden="true" className="shrink-0" />
                      <span className="sr-only">(se abre en una pestaña nueva)</span>
                    </a>
                  ) : (
                    <p className="text-sm text-text-secondary">Todavía no se ha publicado ningún recurso.</p>
                  )}
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {RECURSOS.map((tipo) => (
                  <div key={tipo} className="rounded-xl bg-surface-muted px-3 py-2 min-w-0">
                    <dt className="text-xs text-text-muted truncate" title={tipo}>{tipo}</dt>
                    <dd className="text-lg font-semibold tabular-nums text-text-primary">{data.recursos[tipo] ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-labelledby="titulo-estado">
              <h2 id="titulo-estado" className="font-sans text-xl font-semibold text-text-primary mb-4">Estado de la publicación</h2>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Indicador icon={Clock} tono="warning" label="Por publicar" valor={(estados.pendiente ?? 0) + (estados.procesando ?? 0)} />
                <Indicador icon={CircleCheck} tono="success" label="Publicadas" valor={estados.publicado ?? 0} />
                <Indicador icon={TriangleAlert} tono="error" label="En conflicto" valor={estados.conflicto ?? 0} />
                <Indicador icon={CircleX} tono="error" label="Fallidas" valor={estados.fallido ?? 0} />
              </dl>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  onClick={() => void ejecutar('sincronizar')}
                  isLoading={ejecutando === 'sincronizar'}
                  disabled={ejecutando !== null}
                  leftIcon={<RefreshCw size={16} aria-hidden="true" />}
                >
                  Sincronizar ahora
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void ejecutar('carga-inicial')}
                  isLoading={ejecutando === 'carga-inicial'}
                  disabled={ejecutando !== null}
                  leftIcon={<Upload size={16} aria-hidden="true" />}
                >
                  Publicar recursos maestros
                </Button>
              </div>
            </section>
          </>
        )}

        {/* Mensajes: fuera de los datos para que no desaparezcan al recargar el resumen */}
        <p role="status" className="text-sm font-medium text-success empty:hidden">{aviso}</p>
        {fallo && <p role="alert" className="text-sm font-medium text-error">{fallo}</p>}
        {error && data && <p role="alert" className="text-sm font-medium text-error">{error}</p>}

        {data && (
          <section aria-labelledby="titulo-eventos">
            <h2 id="titulo-eventos" className="font-sans text-xl font-semibold text-text-primary mb-4">Últimos eventos</h2>
            {data.eventos.length === 0 ? (
              <p className="text-center py-12 px-6 text-text-muted bg-surface-card border border-line rounded-2xl text-pretty">
                Todavía no hay eventos. Cada cita que se reserve, cancele o reprograme aparecerá aquí.
              </p>
            ) : (
              <div className="overflow-x-auto bg-surface-card border border-line rounded-2xl">
                <table className="w-full text-left">
                  <caption className="sr-only">Últimos 30 eventos de la outbox FHIR, del más reciente al más antiguo</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface-muted">
                      {['Evento', 'Cita', 'Estado', 'Intentos', 'Registrado', 'Publicado', 'Recurso FHIR'].map((titulo) => (
                        <th key={titulo} scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
                          {titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.eventos.map((evento) => <FilaEvento key={evento.id} evento={evento} />)}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Componentes internos ───────────────────────────────────────────────────

interface IndicadorProps {
  readonly icon: LucideIcon;
  readonly tono: 'success' | 'warning' | 'error';
  readonly label: string;
  readonly valor: number;
}

function Indicador({ icon, tono, label, valor }: IndicadorProps) {
  return (
    <div className="bg-surface-card border border-line rounded-2xl p-5">
      <dt className="text-sm text-text-muted">
        <IconBadge icon={icon} tone={tono} size="sm" className="mb-2" />
        <span className="block">{label}</span>
      </dt>
      <dd className="text-3xl font-bold text-text-primary tabular-nums">{valor}</dd>
    </div>
  );
}

function FilaEvento({ evento }: { readonly evento: EventoFhir }) {
  const estado = ESTADOS[evento.estado];
  const recurso = evento.appointment && evento.servidor
    ? `${evento.servidor}/Appointment/${evento.appointment.id}/_history/${evento.appointment.version}`
    : null;
  return (
    <tr className="border-b border-line last:border-b-0 hover:bg-surface-hover align-top">
      <td className="py-3 px-4 text-sm text-text-secondary tabular-nums">#{evento.id}</td>
      <td className="py-3 px-4 text-sm font-mono text-text-secondary" title={evento.citaId}>{evento.citaId.slice(0, 8)}</td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${estado.className}`}>
          <estado.icon size={14} aria-hidden="true" /> {estado.label}
        </span>
        {evento.error && <p className="mt-1 max-w-sm text-xs text-text-muted text-pretty">{evento.error}</p>}
      </td>
      <td className="py-3 px-4 text-sm text-text-secondary tabular-nums">{evento.intentos}</td>
      <td className="py-3 px-4 text-sm text-text-secondary whitespace-nowrap">{formatearFecha(evento.creadoEn)}</td>
      <td className="py-3 px-4 text-sm text-text-secondary whitespace-nowrap">{formatearFecha(evento.procesadoEn)}</td>
      <td className="py-3 px-4 text-sm">
        {recurso && evento.appointment ? (
          <a
            href={recurso}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ver Appointment (v${evento.appointment.version}) en el servidor FHIR, se abre en una pestaña nueva`}
            className="inline-flex items-center gap-1 min-h-11 font-medium text-link underline underline-offset-2 whitespace-nowrap"
          >
            Ver Appointment (v{evento.appointment.version})
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
    </tr>
  );
}
