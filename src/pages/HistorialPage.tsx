import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppointmentsService, type AppointmentDetail } from '@/services/appointments.service';
import type { AppointmentStatus } from '@/types/database';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; icon: string }> = {
  scheduled: { label: 'Programada', color: 'bg-blue-100 text-blue-700', icon: '📅' },
  completed: { label: 'Completada', color: 'bg-green-100 text-green-700', icon: '✅' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: '❌' },
  rescheduled: { label: 'Reprogramada', color: 'bg-amber-100 text-amber-700', icon: '🔄' },
};

export function HistorialPage() {
  const [appointments, setAppointments] = useState<readonly AppointmentDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    const result = await AppointmentsService.getMyAppointments();

    if (result.success) {
      setAppointments(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

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
        await loadAppointments();
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error('Error cancelling appointment:', { appointmentId, error: err });
      alert('Ocurrió un error inesperado al cancelar la cita.');
    } finally {
      setCancellingAppointmentId(null);
    }
  }, [loadAppointments]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-primary-50 border-b border-primary-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/dashboard"
            className="text-sm text-text-muted hover:text-primary-700 font-medium mb-4 flex items-center gap-1"
          >
            <span aria-hidden="true">←</span> Volver al panel
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
            Mis citas
          </h1>
          <p className="text-text-secondary mt-1">
            Historial completo de tus citas médicas.
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
          <div className="bg-surface-card border border-error/20 rounded-2xl p-8 text-center">
            <span className="text-4xl mb-3 block" aria-hidden="true">⚠️</span>
            <p className="text-error font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => { void loadAppointments(); }} className="mt-4">
              Reintentar
            </Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && appointments.length === 0 && (
          <div className="bg-surface-card border border-primary-100 rounded-2xl p-10 text-center">
            <span className="text-5xl mb-4 block" aria-hidden="true">🗓️</span>
            <h3 className="text-lg font-semibold text-primary-800 mb-2">
              No tienes citas registradas
            </h3>
            <p className="text-text-secondary mb-6">
              Agenda tu primera cita con uno de nuestros médicos.
            </p>
            <Link to="/buscar">
              <Button variant="accent" size="md">
                Buscar médico
                <span aria-hidden="true">→</span>
              </Button>
            </Link>
          </div>
        )}

        {/* List */}
        {!isLoading && !error && appointments.length > 0 && (
          <div className="space-y-4">
            {appointments.map((apt) => {
              const config = STATUS_CONFIG[apt.status];
              const isCancellable = apt.status === 'scheduled';
              const isCancelling = cancellingAppointmentId === apt.id;

              return (
                <div
                  key={apt.id}
                  className="bg-surface-card border border-primary-100 rounded-2xl p-6 hover:shadow-subtle transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.color}`}>
                          {config.icon} {config.label}
                        </span>
                        <span className="text-xs text-text-muted">
                          {apt.mode === 'presencial' ? '🏥 Presencial' : '💻 Telemedicina'}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-primary-800 mb-1">
                        {apt.doctorName}
                      </h3>
                      <p className="text-sm text-accent-500 font-medium mb-2">
                        {apt.specialtyName} · {apt.epsName}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDateLong(apt.slotDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    </div>

                    {isCancellable && (
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
                          onClick={() => { void cancelAppointment(apt.id); }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
