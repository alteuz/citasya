import { useState, useCallback } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppointmentsService, type AppointmentDetail } from '@/services/appointments.service';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useAhora } from '@/hooks/useAhora';
import { estadoVisible, puedeModificarse, separarCitas, type EstadoVisible } from '@/lib/citas';
import { ArrowLeft, ArrowRight, Building2, CalendarClock, CalendarDays, CircleCheck, CircleX, History, Info, RefreshCw, TriangleAlert, Video, type LucideIcon } from 'lucide-react';
import { IconBadge } from '@/components/ui/IconBadge';
import { EtiquetaPaciente } from '@/components/appointments/EtiquetaPaciente';

const STATUS_CONFIG: Record<EstadoVisible, { label: string; color: string; icon: LucideIcon }> = {
  scheduled: { label: 'Programada', color: 'bg-info-soft text-info border border-info/30', icon: CalendarClock },
  completed: { label: 'Completada', color: 'bg-success-soft text-success border border-success/30', icon: CircleCheck },
  cancelled: { label: 'Cancelada', color: 'bg-error-soft text-error border border-error/30', icon: CircleX },
  rescheduled: { label: 'Reprogramada', color: 'bg-warning-soft text-warning border border-warning/30', icon: RefreshCw },
  // Cita activa cuya hora ya terminó (H-36): ya no es próxima ni admite acciones.
  pasada: { label: 'Pasada', color: 'bg-surface-muted text-text-secondary border border-line', icon: History },
};

export function HistorialPage() {
  const { data, error, isLoading, reload } = useServiceQuery(() => AppointmentsService.getMyAppointments(), []);
  const ahora = useAhora();
  const appointments: readonly AppointmentDetail[] = data ?? [];
  const { proximas, historial } = separarCitas(appointments, ahora);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);

  const cancelAppointment = useCallback(async (appointmentId: string): Promise<void> => {
    const userInput = window.prompt('¿Por qué deseas cancelar esta cita? (Opcional):');

    // Si presiona "Cancelar" en el prompt, cancelamos la acción
    if (userInput === null) {
      return;
    }

    // Si hace clic en "Aceptar" vacío, asignamos motivo por defecto
    const reason = userInput.trim() === '' ? 'Cancelado por el paciente' : userInput.trim();

    setCancellingAppointmentId(appointmentId);
    try {
      const result = await AppointmentsService.cancelAppointment(appointmentId, reason);
      if (result.success) {
        reload();
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error('Error cancelling appointment:', { appointmentId, error: err });
      alert('Ocurrió un error inesperado al cancelar la cita.');
    } finally {
      setCancellingAppointmentId(null);
    }
  }, [reload]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 min-h-11 -ml-1 px-1 rounded-lg text-sm text-text-muted hover:text-text-primary font-medium mb-3"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Volver al panel
          </Link>
          <h1 className="text-2xl md:text-3xl text-text-primary">
            Mis citas
          </h1>
          <p className="text-text-secondary mt-1">
            Tus próximas citas y el historial de las anteriores.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height="140px" rounded="2xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="bg-error-soft border border-error/30 rounded-2xl p-8 text-center">
            <IconBadge icon={TriangleAlert} tone="error" size="md" className="mb-4" />
            <p className="text-error font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={reload} className="mt-4">
              Reintentar
            </Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && appointments.length === 0 && (
          <div className="bg-surface-card border border-line rounded-2xl p-10 text-center">
            <IconBadge icon={CalendarDays} size="lg" className="mb-5" />
            <h2 className="font-sans text-lg font-semibold text-text-primary mb-2">
              No tienes citas registradas
            </h2>
            <p className="text-text-secondary mb-6">
              Agenda tu primera cita con uno de nuestros médicos.
            </p>
            <Link to="/buscar">
              <Button variant="primary" size="md">
                Buscar médico
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
            </Link>
          </div>
        )}

        {/* Próximas e historial */}
        {!isLoading && !error && appointments.length > 0 && (
          <div className="space-y-10">
            <section aria-labelledby="proximas-heading">
              <h2 id="proximas-heading" className="font-sans text-xl font-semibold text-text-primary mb-4">
                Próximas citas <span className="text-text-muted font-normal">({proximas.length})</span>
              </h2>
              {proximas.length === 0 ? (
                <div className="bg-surface-card border border-line rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="text-text-secondary">No tienes citas próximas.</p>
                  <Link to="/buscar">
                    <Button variant="primary" size="sm">
                      Agendar una cita
                      <ArrowRight size={16} aria-hidden="true" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {proximas.map((apt) => (
                    <TarjetaCita
                      key={apt.id}
                      cita={apt}
                      ahora={ahora}
                      isCancelling={cancellingAppointmentId === apt.id}
                      onCancel={cancelAppointment}
                    />
                  ))}
                </div>
              )}
            </section>

            {historial.length > 0 && (
              <section aria-labelledby="historial-heading">
                <h2 id="historial-heading" className="font-sans text-xl font-semibold text-text-primary mb-4">
                  Historial <span className="text-text-muted font-normal">({historial.length})</span>
                </h2>
                <div className="space-y-4">
                  {historial.map((apt) => (
                    <TarjetaCita
                      key={apt.id}
                      cita={apt}
                      ahora={ahora}
                      isCancelling={cancellingAppointmentId === apt.id}
                      onCancel={cancelAppointment}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tarjeta de cita ────────────────────────────────────────────────────────

interface TarjetaCitaProps {
  readonly cita: AppointmentDetail;
  readonly ahora: Date;
  readonly isCancelling: boolean;
  readonly onCancel: (appointmentId: string) => Promise<void>;
}

function TarjetaCita({ cita: apt, ahora, isCancelling, onCancel }: TarjetaCitaProps) {
  const estado = estadoVisible(apt, ahora);
  const config = STATUS_CONFIG[estado];
  const esProximaActiva = estado === 'scheduled' || estado === 'rescheduled';
  // Cancelar y reprogramar exigen 24 h de anticipación (regla de la base de datos).
  const admiteCambios = puedeModificarse(apt, ahora);

  return (
    <div className="bg-surface-card border border-line rounded-2xl p-5 sm:p-6 hover:border-line-strong">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${config.color}`}>
              <config.icon size={13} aria-hidden="true" /> {config.label}
            </span>
            <EtiquetaPaciente nombre={apt.familiarNombre} parentesco={apt.familiarParentesco} />
            <span className="text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5">{apt.mode === 'presencial' ? <Building2 size={14} aria-hidden="true" /> : <Video size={14} aria-hidden="true" />}{apt.mode === 'presencial' ? 'Presencial' : 'Telemedicina'}</span>
            </span>
          </div>

          <h3 className="text-base font-semibold text-text-primary mb-1">
            {apt.doctorName}
          </h3>
          <p className="text-sm text-accent font-medium mb-2">
            {apt.specialtyName} · {apt.epsName}
          </p>

          <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDateLong(apt.slotDate)}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTime(apt.slotStartTime)} - {formatTime(apt.slotEndTime)}
            </span>
          </div>

          {apt.cancellationReason && (
            <p className="text-xs text-text-muted mt-2 italic">
              Motivo: {apt.cancellationReason}
            </p>
          )}

          {esProximaActiva && !admiteCambios && (
            <p className="mt-3 flex items-start gap-1.5 text-sm text-text-secondary">
              <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
              Faltan menos de 24 horas: ya no se puede cancelar ni reprogramar desde la aplicación.
            </p>
          )}
        </div>

        {admiteCambios && (
          <div className="flex gap-2">
            <Link to={`/reprogramar/${apt.id}`}>
              <Button
                variant="secondary"
                size="sm"
                disabled={isCancelling}
              >
                Reprogramar
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              isLoading={isCancelling}
              onClick={() => { void onCancel(apt.id); }}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(time: string): string {
  const parts = time.split(':');
  const h = parts[0] ?? '0';
  const m = parts[1] ?? '00';
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${suffix}`;
}

function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
