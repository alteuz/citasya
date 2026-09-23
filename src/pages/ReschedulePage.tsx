import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthContext } from '@/hooks/useAuthContext';
import { DoctorsService, type SlotResult } from '@/services/doctors.service';
import { AppointmentsService, type AppointmentDetail } from '@/services/appointments.service';
import type { AppointmentMode } from '@/types/database';
import { AppointmentModeSelector } from '@/components/appointments/AppointmentModeSelector';

type RescheduleStep = 'select' | 'confirm' | 'success';

export function ReschedulePage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();

  // Data
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [slots, setSlots] = useState<readonly SlotResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking state
  const [step, setStep] = useState<RescheduleStep>('select');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<SlotResult | null>(null);
  const [mode, setMode] = useState<AppointmentMode>('presencial');
  const [notes, setNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Cargar cita original y slots del médico
  useEffect(() => {
    if (!appointmentId) return;

    async function loadData() {
      setIsLoading(true);
      const apptResult = await AppointmentsService.getAppointmentById(appointmentId!);

      if (!apptResult.success) {
        setError(apptResult.error);
        setIsLoading(false);
        return;
      }

      setAppointment(apptResult.data);
      setMode(apptResult.data.mode);
      setNotes(apptResult.data.notes || '');

      // Load slots for this doctor
      const slotsResult = await DoctorsService.getAvailableSlots(apptResult.data.doctorId);
      
      if (slotsResult.success) {
        setSlots(slotsResult.data);
      } else {
        setError(slotsResult.error);
      }
      
      setIsLoading(false);
    }

    void loadData();
  }, [appointmentId]);

  // Agrupar slots por fecha
  const slotsByDate = useMemo(() => {
    const groups = new Map<string, SlotResult[]>();
    for (const slot of slots) {
      const existing = groups.get(slot.date) ?? [];
      existing.push(slot);
      groups.set(slot.date, existing);
    }
    return groups;
  }, [slots]);

  // Fechas disponibles
  const availableDates = useMemo(() => Array.from(slotsByDate.keys()).sort(), [slotsByDate]);

  // Seleccionar primera fecha disponible por defecto
  useEffect(() => {
    const firstDate = availableDates[0];
    if (firstDate && !selectedDate) {
      setSelectedDate(firstDate);
    }
  }, [availableDates, selectedDate]);

  // Slots de la fecha seleccionada
  const currentSlots = useMemo(
    () => slotsByDate.get(selectedDate) ?? [],
    [slotsByDate, selectedDate],
  );

  const handleSelectSlot = useCallback((slot: SlotResult) => {
    setSelectedSlot(slot);
    setBookingError(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!isAuthenticated) {
      navigate('/iniciar-sesion');
      return;
    }
    if (!selectedSlot) return;
    setStep('confirm');
  }, [isAuthenticated, selectedSlot, navigate]);

  const handleReschedule = useCallback(async () => {
    if (!selectedSlot || !appointment) return;

    setIsBooking(true);
    setBookingError(null);

    const result = await AppointmentsService.rescheduleAppointment(
      appointment.id,
      selectedSlot.id,
      mode,
      notes.trim() || undefined
    );

    setIsBooking(false);

    if (!result.success) {
      setBookingError(result.error);
      return;
    }

    setStep('success');
  }, [selectedSlot, appointment, mode, notes]);

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <Skeleton width="300px" height="32px" rounded="lg" />
        <Skeleton width="200px" height="20px" rounded="md" className="mt-2" />
        <div className="mt-8 grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height="48px" rounded="xl" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error || !appointment) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center animate-fade-in">
        <span className="text-5xl mb-4 block" aria-hidden="true">😕</span>
        <h1 className="text-2xl font-bold text-primary-800 mb-2">Error al cargar</h1>
        <p className="text-text-secondary mb-6">{error ?? 'La cita solicitada no existe o no tienes permisos.'}</p>
        <Link to="/dashboard">
          <Button variant="primary" size="md">Volver a mi panel</Button>
        </Link>
      </div>
    );
  }

  // ─── Success step ─────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
        <div className="bg-surface-card border border-primary-100 rounded-2xl p-8 text-center">
          <span className="text-6xl mb-4 block" aria-hidden="true">✅</span>
          <h1 className="text-2xl font-bold text-primary-800 mb-2">
            ¡Cita reprogramada!
          </h1>
          <p className="text-text-secondary mb-6">
            Tu cita ha sido modificada exitosamente.
          </p>

          <div className="bg-primary-50 rounded-xl p-6 text-left space-y-3 mb-6">
            <InfoRow label="Médico" value={appointment.doctorName} />
            <InfoRow label="Nueva Fecha" value={formatDateLong(selectedSlot!.date)} />
            <InfoRow label="Nueva Hora" value={`${formatTime(selectedSlot!.startTime)} - ${formatTime(selectedSlot!.endTime)}`} />
            <InfoRow label="Modalidad" value={mode === 'presencial' ? '🏥 Presencial' : '💻 Telemedicina'} />
          </div>

          <Link to="/dashboard/historial" className="block w-full">
            <Button variant="primary" size="md" fullWidth>
              Ver mi historial
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Confirm step ─────────────────────────────────────────────────────────
  if (step === 'confirm' && selectedSlot) {
    return (
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <button
          type="button"
          onClick={() => setStep('select')}
          className="text-sm text-text-muted hover:text-primary-700 font-medium mb-6 flex items-center gap-1 cursor-pointer"
        >
          <span aria-hidden="true">←</span> Cambiar horario
        </button>

        <h1 className="text-2xl font-bold text-primary-800 mb-6">
          Confirmar reprogramación
        </h1>

        <div className="bg-surface-card border border-primary-100 rounded-2xl p-6 space-y-6">
          {/* Alerta de cambio */}
          <div className="bg-accent-50 border border-accent-200 text-accent-700 text-sm font-medium px-4 py-3 rounded-xl flex items-start gap-3">
             <span aria-hidden="true" className="text-accent-500">ℹ️</span>
             <p>Estás a punto de cambiar tu cita del <strong>{formatDateLong(appointment.slotDate)}</strong> a una nueva fecha.</p>
          </div>

          {/* Resumen Nuevo */}
          <div className="bg-primary-50 rounded-xl p-5 space-y-3">
            <InfoRow label="Médico" value={appointment.doctorName} />
            <InfoRow label="Nueva Fecha" value={formatDateLong(selectedSlot.date)} />
            <InfoRow label="Nueva Hora" value={`${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}`} />
          </div>

          {/* Modo */}
          <AppointmentModeSelector value={mode} onChange={setMode} />

          {/* Error */}
          {bookingError && (
            <div role="alert" className="bg-red-50 border border-error/20 text-error text-sm font-medium px-4 py-3 rounded-xl">
              {bookingError}
            </div>
          )}

          {/* Submit */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isBooking}
            onClick={() => { void handleReschedule(); }}
          >
            Confirmar reprogramación
          </Button>
        </div>
      </div>
    );
  }

  // ─── Select step (default) ────────────────────────────────────────────────
  const initials = appointment.doctorName
    .split(' ')
    .filter((_, i) => i === 0 || i === 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-primary-50 border-b border-primary-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/dashboard/historial"
            className="text-sm text-text-muted hover:text-primary-700 font-medium mb-4 flex items-center gap-1"
          >
            <span aria-hidden="true">←</span> Volver al historial
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-200 text-primary-800 font-bold text-xl flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-primary-800">
                Reprogramar cita con {appointment.doctorName}
              </h1>
              <p className="text-sm text-text-muted mt-1">Cita actual: {formatDateLong(appointment.slotDate)} a las {formatTime(appointment.slotStartTime)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Date picker */}
        <h2 className="text-lg font-semibold text-primary-800 mb-4">
          Selecciona una nueva fecha
        </h2>

        {availableDates.length === 0 ? (
          <div className="bg-surface-card border border-primary-100 rounded-2xl p-8 text-center mb-8">
            <span className="text-4xl mb-3 block" aria-hidden="true">📅</span>
            <p className="text-text-secondary">No hay horarios disponibles en los próximos 14 días para este médico.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide" role="listbox" aria-label="Fechas disponibles">
              {availableDates.map((date) => {
                const isSelected = date === selectedDate;
                const dayName = formatDayShort(date);
                const dayNum = new Date(date + 'T12:00:00').getDate();
                const monthName = formatMonthShort(date);

                return (
                  <button
                    key={date}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                    className={`flex flex-col items-center px-4 py-3 rounded-xl border-2 min-w-[72px] shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-accent-400 bg-accent-400/10 text-accent-600'
                        : 'border-primary-200 text-text-secondary hover:border-primary-300'
                    }`}
                  >
                    <span className="text-xs font-medium uppercase">{dayName}</span>
                    <span className="text-xl font-bold">{dayNum}</span>
                    <span className="text-xs">{monthName}</span>
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            <h2 className="text-lg font-semibold text-primary-800 mb-4">
              Horarios disponibles — {formatDateLong(selectedDate)}
            </h2>

            {currentSlots.length === 0 ? (
              <div className="bg-surface-card border border-primary-100 rounded-xl p-6 text-center">
                <p className="text-text-secondary">No hay horarios disponibles para esta fecha.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-8">
                {currentSlots.map((slot) => {
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => handleSelectSlot(slot)}
                      className={`py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'border-accent-400 bg-accent-400 text-white shadow-md'
                          : 'border-primary-200 text-text-secondary hover:border-accent-300 hover:bg-accent-50'
                      }`}
                    >
                      {formatTime(slot.startTime)}
                    </button>
                  );
                })}
              </div>
            )}

            {/* CTA */}
            {selectedSlot && (
              <div className="sticky bottom-4 bg-surface-card/95 backdrop-blur-md border border-primary-100 rounded-2xl p-4 shadow-elevated flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary-800">
                    {formatDateLong(selectedSlot.date)}, {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                  </p>
                  <p className="text-xs text-text-muted">Nuevo horario seleccionado</p>
                </div>
                <Button variant="primary" size="md" onClick={handleConfirm}>
                  Continuar
                  <span aria-hidden="true">→</span>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface InfoRowProps {
  readonly label: string;
  readonly value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-medium text-primary-800">{value}</span>
    </div>
  );
}

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

function formatDayShort(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-CO', { weekday: 'short' }).slice(0, 3);
}

function formatMonthShort(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-CO', { month: 'short' });
}
