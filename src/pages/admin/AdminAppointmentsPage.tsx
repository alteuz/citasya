import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminService, type AdminAppointment } from '@/services/admin.service';
import type { AppointmentStatus } from '@/types/database';
import { useServiceQuery } from '@/hooks/useServiceQuery';

const STATUS_TABS: Array<{ value: AppointmentStatus | 'all'; label: string; icon: string }> = [
  { value: 'all', label: 'Todas', icon: '📋' },
  { value: 'scheduled', label: 'Programadas', icon: '📅' },
  { value: 'completed', label: 'Completadas', icon: '✅' },
  { value: 'cancelled', label: 'Canceladas', icon: '❌' },
];

const STATUS_BADGE: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: { label: 'Programada', className: 'bg-info-soft text-info border border-info/30' },
  completed: { label: 'Completada', className: 'bg-success-soft text-success border border-success/30' },
  cancelled: { label: 'Cancelada', className: 'bg-error-soft text-error border border-error/30' },
  rescheduled: { label: 'Reprogramada', className: 'bg-warning-soft text-warning border border-warning/30' },
};

export function AdminAppointmentsPage() {
  const [activeTab, setActiveTab] = useState<AppointmentStatus | 'all'>('all');
  // Si se cambia de pestaña antes de que llegue la respuesta anterior, esa
  // respuesta se descarta (useServiceQuery): no se mezclan resultados.
  const { data, error, isLoading, reload } = useServiceQuery(
    () => AdminService.getAllAppointments(activeTab === 'all' ? undefined : activeTab),
    [activeTab],
  );
  const appointments: readonly AdminAppointment[] = data ?? [];


  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/admin" className="inline-flex items-center gap-1 min-h-11 -ml-1 px-1 rounded-lg text-sm text-text-muted hover:text-text-primary font-medium mb-3">
            <span aria-hidden="true">←</span> Volver al panel
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
            Todas las Citas 🗓️
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={activeTab === tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`inline-flex items-center min-h-11 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap presionable cursor-pointer ${
                activeTab === tab.value
                  ? 'bg-brand text-white border border-brand'
                  : 'bg-surface-card border border-line-input text-text-secondary hover:border-text-muted hover:text-text-primary'
              }`}
            >
              <span aria-hidden="true">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height="64px" rounded="xl" />)}
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="bg-error-soft border border-error/30 rounded-2xl p-8 text-center">
            <p className="text-error font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={reload} className="mt-4">Reintentar</Button>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <>
            <p className="text-sm text-text-muted mb-4">{appointments.length} cita(s) encontrada(s)</p>
            <div className="overflow-x-auto bg-surface-card border border-line rounded-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-muted">
                    <th scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Paciente</th>
                    <th scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Médico</th>
                    <th scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Especialidad</th>
                    <th scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Fecha</th>
                    <th scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Hora</th>
                    <th scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Modo</th>
                    <th scope="col" className="py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => {
                    const badge = STATUS_BADGE[apt.status];
                    return (
                      <tr key={apt.id} className="border-b border-line last:border-b-0 hover:bg-surface-hover">
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-text-primary">{apt.patientName}</p>
                          <p className="text-xs text-text-muted">{apt.patientEmail}</p>
                        </td>
                        <td className="py-3 px-4 text-sm text-text-secondary">{apt.doctorName}</td>
                        <td className="py-3 px-4 text-sm text-accent font-medium">{apt.specialtyName}</td>
                        <td className="py-3 px-4 text-sm text-text-secondary">{formatDateShort(apt.slotDate)}</td>
                        <td className="py-3 px-4 text-sm text-text-secondary">{formatTime(apt.slotStartTime)}</td>
                        <td className="py-3 px-4 text-xs text-text-muted">
                          {apt.mode === 'presencial' ? '🏥' : '💻'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {appointments.length === 0 && (
                <div className="text-center py-12 px-6 text-text-muted bg-surface-card border border-line rounded-2xl">
                  No hay citas con este filtro.
                </div>
              )}
            </div>
          </>
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

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
