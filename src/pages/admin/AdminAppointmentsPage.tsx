import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminService, type AdminAppointment } from '@/services/admin.service';
import type { AppointmentStatus } from '@/types/database';

const STATUS_TABS: Array<{ value: AppointmentStatus | 'all'; label: string; icon: string }> = [
  { value: 'all', label: 'Todas', icon: '📋' },
  { value: 'scheduled', label: 'Programadas', icon: '📅' },
  { value: 'completed', label: 'Completadas', icon: '✅' },
  { value: 'cancelled', label: 'Canceladas', icon: '❌' },
];

const STATUS_BADGE: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: { label: 'Programada', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completada', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
  rescheduled: { label: 'Reprogramada', className: 'bg-amber-100 text-amber-700' },
};

export function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<readonly AdminAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppointmentStatus | 'all'>('all');

  const loadAppointments = useCallback(async (filter: AppointmentStatus | 'all') => {
    setIsLoading(true);
    setError(null);
    const statusFilter = filter === 'all' ? undefined : filter;
    const result = await AdminService.getAllAppointments(statusFilter);

    if (result.success) {
      setAppointments(result.data);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadAppointments(activeTab);
  }, [activeTab, loadAppointments]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-primary-50 border-b border-primary-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/admin" className="text-sm text-text-muted hover:text-primary-700 font-medium mb-4 flex items-center gap-1">
            <span aria-hidden="true">←</span> Volver al panel
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
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
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.value
                  ? 'bg-primary-800 text-white'
                  : 'bg-surface-card border border-primary-200 text-text-secondary hover:border-primary-300'
              }`}
            >
              {tab.icon} {tab.label}
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
          <div className="bg-surface-card border border-error/20 rounded-2xl p-8 text-center">
            <p className="text-error font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => { void loadAppointments(activeTab); }} className="mt-4">Reintentar</Button>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <>
            <p className="text-sm text-text-muted mb-4">{appointments.length} cita(s) encontrada(s)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-primary-100">
                    <th className="py-3 px-3 text-xs font-semibold text-text-muted uppercase">Paciente</th>
                    <th className="py-3 px-3 text-xs font-semibold text-text-muted uppercase">Médico</th>
                    <th className="py-3 px-3 text-xs font-semibold text-text-muted uppercase">Especialidad</th>
                    <th className="py-3 px-3 text-xs font-semibold text-text-muted uppercase">Fecha</th>
                    <th className="py-3 px-3 text-xs font-semibold text-text-muted uppercase">Hora</th>
                    <th className="py-3 px-3 text-xs font-semibold text-text-muted uppercase">Modo</th>
                    <th className="py-3 px-3 text-xs font-semibold text-text-muted uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => {
                    const badge = STATUS_BADGE[apt.status];
                    return (
                      <tr key={apt.id} className="border-b border-primary-50 hover:bg-primary-50/50 transition-colors">
                        <td className="py-3 px-3">
                          <p className="text-sm font-medium text-primary-800">{apt.patientName}</p>
                          <p className="text-xs text-text-muted">{apt.patientEmail}</p>
                        </td>
                        <td className="py-3 px-3 text-sm text-text-secondary">{apt.doctorName}</td>
                        <td className="py-3 px-3 text-sm text-accent-500 font-medium">{apt.specialtyName}</td>
                        <td className="py-3 px-3 text-sm text-text-secondary">{formatDateShort(apt.slotDate)}</td>
                        <td className="py-3 px-3 text-sm text-text-secondary">{formatTime(apt.slotStartTime)}</td>
                        <td className="py-3 px-3 text-xs text-text-muted">
                          {apt.mode === 'presencial' ? '🏥' : '💻'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {appointments.length === 0 && (
                <div className="text-center py-12 text-text-muted">
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
