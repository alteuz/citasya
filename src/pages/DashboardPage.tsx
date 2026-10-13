import { useState, useCallback } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/hooks/useAuthContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppointmentsService, type AppointmentDetail } from '@/services/appointments.service';
import { AuthService } from '@/services/auth.service';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { ArrowRight, Building2, CalendarDays, CalendarPlus, ClipboardList, Pencil, Settings, Video, type LucideIcon } from 'lucide-react';
import { IconBadge } from '@/components/ui/IconBadge';

export function DashboardPage() {
  const { profile, isLoading: authLoading, refreshProfile, user } = useAuthContext();
  const {
    data: myAppointments,
    isLoading: isLoadingAppointments,
    reload: reloadAppointments,
  } = useServiceQuery(() => AppointmentsService.getMyAppointments(), []);
  // Solo citas programadas (futuras)
  const upcomingAppointments: readonly AppointmentDetail[] =
    myAppointments?.filter((apt) => apt.status === 'scheduled') ?? [];
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const startEditing = () => {
    if (profile) {
      setEditFullName(profile.fullName);
      setEditPhone(profile.phone || '');
      setProfileError(null);
      setIsEditingProfile(true);
    }
  };

  const cancelEditing = useCallback(() => {
    setIsEditingProfile(false);
    setProfileError(null);
  }, []);

  const saveProfile = useCallback(async () => {
    if (!user || !profile) return;
    setIsSavingProfile(true);
    setProfileError(null);

    const result = await AuthService.updateProfile(user.id, {
      fullName: editFullName,
      phone: editPhone
    });

    if (result.success) {
      await refreshProfile();
      setIsEditingProfile(false);
    } else {
      setProfileError(result.error);
    }
    setIsSavingProfile(false);
  }, [user, profile, editFullName, editPhone, refreshProfile]);

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
        reloadAppointments();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error cancelling appointment:', { appointmentId, error });
      alert('Ocurrió un error inesperado al cancelar la cita.');
    } finally {
      setCancellingAppointmentId(null);
    }
  }, [reloadAppointments]);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton width="250px" height="32px" rounded="lg" />
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton height="160px" rounded="xl" />
          <Skeleton height="160px" rounded="xl" />
          <Skeleton height="160px" rounded="xl" />
        </div>
      </div>
    );
  }

  const firstName = profile?.fullName?.split(' ')[0] ?? 'Paciente';

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl md:text-3xl text-text-primary">
            ¡Hola, {firstName}!
          </h1>
          <p className="text-text-secondary mt-1">
            Gestiona tus citas médicas desde aquí.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <QuickActionCard
            icon={CalendarPlus}
            title="Agendar nueva cita"
            description="Busca médicos disponibles y agenda tu próxima cita."
            href="/buscar"
            ctaText="Agendar cita"
            variant="primary"
          />
          <QuickActionCard
            icon={ClipboardList}
            title="Mis citas"
            description="Revisa tus citas programadas y el historial."
            href="/dashboard/historial"
            ctaText="Ver historial"
            variant="primary"
          />
            <QuickActionCard
              icon={Building2}
              title="Directorio EPS"
              description="Consulta las EPS vinculadas y sus especialidades."
              href="/directorio-eps"
              ctaText="Ver directorio"
              variant="primary"
            />
            {profile?.role === 'admin' && (
              <QuickActionCard
                icon={Settings}
                title="Panel de Admin"
                description="Gestión del sistema, usuarios y estadísticas globales."
                href="/admin"
                ctaText="Ir al Panel"
                variant="primary"
              />
            )}
          </div>

        {/* Upcoming Appointments */}
        <section aria-labelledby="upcoming-heading">
          <div className="flex items-center justify-between mb-6">
            <h2 id="upcoming-heading" className="font-sans text-xl font-semibold text-text-primary">
              Próximas citas
            </h2>
            <Link to="/dashboard/historial" className="inline-flex items-center min-h-11 px-1 rounded-lg text-sm text-accent hover:text-accent-hover hover:underline underline-offset-4 font-medium">
              Ver todas <ArrowRight size={14} aria-hidden="true" className="ml-1" />
            </Link>
          </div>

          {/* Loading */}
          {isLoadingAppointments && (
            <div className="space-y-4">
              <Skeleton height="120px" rounded="2xl" />
              <Skeleton height="120px" rounded="2xl" />
            </div>
          )}

          {/* Empty state */}
          {!isLoadingAppointments && upcomingAppointments.length === 0 && (
            <div className="bg-surface-card border border-line rounded-2xl p-10 text-center">
              <IconBadge icon={CalendarDays} size="lg" className="mb-5" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                No tienes citas próximas
              </h3>
              <p className="text-text-secondary mb-6 max-w-md mx-auto">
                Agenda tu primera cita con uno de nuestros médicos afiliados.
              </p>
              <Link to="/buscar">
                <Button variant="primary" size="md">
                  Buscar médico disponible
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </Link>
            </div>
          )}

          {/* Appointment cards */}
          {!isLoadingAppointments && upcomingAppointments.length > 0 && (
            <div className="space-y-4">
              {upcomingAppointments.slice(0, 3).map((apt) => (
                <div
                  key={apt.id}
                  className="bg-surface-card border border-line rounded-2xl p-5 sm:p-6 hover:border-line-strong flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent border border-accent/20 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">
                        {apt.doctorName}
                      </h3>
                      <p className="text-sm text-accent font-medium">
                        {apt.specialtyName}
                      </p>
                      <p className="text-sm text-text-secondary mt-1">
                        {formatDateLong(apt.slotDate)} · {formatTime(apt.slotStartTime)} - {formatTime(apt.slotEndTime)}
                      </p>
                      <span className="text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1.5">{apt.mode === 'presencial' ? <Building2 size={14} aria-hidden="true" /> : <Video size={14} aria-hidden="true" />}{apt.mode === 'presencial' ? 'Presencial' : 'Telemedicina'}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-stretch sm:items-end">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-info-soft text-info border border-info/30 self-start sm:self-end whitespace-nowrap text-center mb-1">
                      Programada
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Link to={`/reprogramar/${apt.id}`} className="w-full sm:w-auto">
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          disabled={cancellingAppointmentId === apt.id}
                        >
                          Reprogramar
                        </Button>
                      </Link>
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={cancellingAppointmentId === apt.id}
                        onClick={() => { void cancelAppointment(apt.id); }}
                        className="w-full sm:w-auto"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Profile Info */}
        {profile && (
          <section className="mt-10" aria-labelledby="profile-heading">
            <div className="flex items-center justify-between mb-4">
              <h2 id="profile-heading" className="font-sans text-xl font-semibold text-text-primary">
                Tu información
              </h2>
              {!isEditingProfile && (
                <Button variant="ghost" size="sm" onClick={startEditing}>
                  <Pencil size={16} aria-hidden="true" /> Editar
                </Button>
              )}
            </div>

            <div className="bg-surface-card border border-line rounded-2xl p-6">
              {profileError && (
                <div className="mb-4 px-4 py-3 bg-error-soft text-error text-sm font-medium rounded-xl border border-error/30">
                  {profileError}
                </div>
              )}

              {isEditingProfile ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="perfil-nombre" className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                      Nombre Completo
                    </label>
                    <input
                      id="perfil-nombre"
                      type="text"
                      autoComplete="name"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="control-campo"
                    />
                  </div>
                  <div>
                    <label htmlFor="perfil-cedula" className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                      Cédula <span className="lowercase normal-case text-text-muted ml-1">(solo lectura)</span>
                    </label>
                    {/* readOnly (no disabled): sigue siendo enfocable y legible por lectores de pantalla */}
                    <input
                      id="perfil-cedula"
                      type="text"
                      value={profile.cedula}
                      readOnly
                      className="control-campo bg-surface-muted text-text-muted cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label htmlFor="perfil-correo" className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                      Correo Electrónico <span className="lowercase normal-case text-text-muted ml-1">(solo lectura)</span>
                    </label>
                    <input
                      id="perfil-correo"
                      type="email"
                      autoComplete="email"
                      value={profile.email}
                      readOnly
                      className="control-campo bg-surface-muted text-text-muted cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label htmlFor="perfil-telefono" className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5">
                      Teléfono
                    </label>
                    <input
                      id="perfil-telefono"
                      type="tel"
                      autoComplete="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="control-campo"
                    />
                  </div>
                  
                  <div className="sm:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-line">
                    <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={isSavingProfile}>
                      Cancelar
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => { void saveProfile(); }} isLoading={isSavingProfile}>
                      Guardar cambios
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label="Nombre" value={profile.fullName} />
                  <InfoItem label="Cédula" value={profile.cedula} />
                  <InfoItem label="Correo" value={profile.email} />
                  <InfoItem label="Teléfono" value={profile.phone || 'No registrado'} />
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Subcomponentes internos ────────────────────────────────────────────────

interface QuickActionCardProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly ctaText: string;
  readonly variant: 'primary' | 'accent';
}

function QuickActionCard({ icon, title, description, href, ctaText, variant }: QuickActionCardProps) {
  return (
    <div className="bg-surface-card border border-line rounded-2xl p-6 hover:border-line-strong hover:shadow-elevated hover:-translate-y-0.5 transicion h-full tarjeta-luz">
      <IconBadge icon={icon} tone="brand" size="sm" className="mb-4" />
      <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary mb-4">{description}</p>
      <Link to={href}>
        <Button variant={variant} size="sm">
          {ctaText}
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </Link>
    </div>
  );
}

interface InfoItemProps {
  readonly label: string;
  readonly value: string;
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</dt>
      <dd className="text-base text-text-primary font-medium mt-0.5">{value}</dd>
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
  });
}
