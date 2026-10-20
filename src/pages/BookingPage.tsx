import { useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthContext } from '@/hooks/useAuthContext';
import { DoctorsService, type DoctorSearchResult, type SlotResult } from '@/services/doctors.service';
import { AppointmentsService, type AppointmentDetail } from '@/services/appointments.service';
import type { AppointmentMode } from '@/types/database';
import { AppointmentModeSelector } from '@/components/appointments/AppointmentModeSelector';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { FamiliaService } from '@/services/familia.service';
import { PARA_MI, opcionesDePaciente, pacientePorDefecto } from '@/lib/familia';
import type { ServiceResult } from '@/types/common';
import { ArrowLeft, ArrowRight, CalendarCheck, CalendarX, SearchX } from 'lucide-react';
import { IconBadge } from '@/components/ui/IconBadge';

interface DoctorAgenda {
  readonly doctor: DoctorSearchResult;
  readonly slots: readonly SlotResult[];
}

/** Médico (obligatorio) y sus horarios disponibles (vacío si fallan). */
async function loadDoctorAgenda(doctorId: string): Promise<ServiceResult<DoctorAgenda>> {
  const [doctorResult, slotsResult] = await Promise.all([
    DoctorsService.getDoctorById(doctorId),
    DoctorsService.getAvailableSlots(doctorId),
  ]);
  if (!doctorResult.success) return doctorResult;
  return {
    success: true,
    data: { doctor: doctorResult.data, slots: slotsResult.success ? slotsResult.data : [] },
  };
}

/** Solo se aceptan modalidades válidas desde la URL; cualquier otro valor usa la presencial. */
function parseMode(value: string | null): AppointmentMode {
  return value === 'telemedicina' ? 'telemedicina' : 'presencial';
}

type BookingStep = 'select' | 'confirm' | 'success';

export function BookingPage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuthContext();

  // Data
  const { data: agenda, error, isLoading } = useServiceQuery(
    () => loadDoctorAgenda(doctorId ?? ''),
    [doctorId],
    Boolean(doctorId),
  );
  const doctor = agenda?.doctor ?? null;
  const slots = useMemo(() => agenda?.slots ?? [], [agenda]);

  // Booking state
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<BookingStep>('select');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<SlotResult | null>(null);
  
  // Si la URL dice ?modo=telemedicina, seleccionarlo por defecto (valor validado)
  const [mode, setMode] = useState<AppointmentMode>(() => parseMode(searchParams.get('modo')));
  
  const [notes, setNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookedAppointment, setBookedAppointment] = useState<AppointmentDetail | null>(null);

  // ¿Para quién es la cita? (RF-13). Solo pueden elegirse el titular o los
  // familiares de la EPS del médico; la base de datos aplica la misma regla.
  const { data: familiares } = useServiceQuery(() => FamiliaService.listar(), [isAuthenticated], isAuthenticated);
  const conFamilia = (familiares?.length ?? 0) > 0;
  const paraPedido = searchParams.get('para');
  const opcionesPaciente = useMemo(
    () => opcionesDePaciente(
      { epsId: profile?.epsId ?? '', epsName: profile?.epsName ?? '' },
      familiares ?? [],
      doctor?.epsId ?? null,
    ),
    [profile, familiares, doctor],
  );
  const [pacienteElegido, setPacienteElegido] = useState<string | null>(null);
  const clavePaciente = pacienteElegido
    ?? pacientePorDefecto(opcionesPaciente, !paraPedido || paraPedido === 'yo' ? PARA_MI : paraPedido);
  const paciente = opcionesPaciente.find((o) => o.clave === clavePaciente) ?? null;
  const nombrePaciente = paciente?.familiarId ? paciente.nombre : (profile?.fullName || 'Tú');

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

  // Fecha efectiva: la elegida por el paciente o, por defecto, la primera disponible
  // (estado derivado, sin efecto que lo copie a otro estado).
  const activeDate = selectedDate || availableDates[0] || '';

  // Slots de la fecha seleccionada
  const currentSlots = useMemo(
    () => slotsByDate.get(activeDate) ?? [],
    [slotsByDate, activeDate],
  );

  const handleSelectSlot = useCallback((slot: SlotResult) => {
    setSelectedSlot(slot);
    setBookingError(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!isAuthenticated) {
      navigate('/iniciar-sesion', { state: { from: { pathname: `/buscar/${doctorId ?? ''}` } } });
      return;
    }
    if (!selectedSlot) return;
    setStep('confirm');
  }, [isAuthenticated, selectedSlot, navigate, doctorId]);

  const handleBook = useCallback(async () => {
    if (!selectedSlot || !doctor || !paciente) return;

    setIsBooking(true);
    setBookingError(null);

    const result = await AppointmentsService.bookAppointment({
      // Médico, EPS y especialidad los deduce la base de datos a partir del
      // horario: no se confía en datos enviados por el navegador.
      slotId: selectedSlot.id,
      mode,
      notes: notes.trim() || undefined,
      familiarId: paciente.familiarId,
    });

    setIsBooking(false);

    if (!result.success) {
      setBookingError(result.error);
      return;
    }

    setBookedAppointment(result.data);
    setStep('success');
  }, [selectedSlot, doctor, paciente, mode, notes]);

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
  if (error || !doctor) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center animate-fade-in">
        <IconBadge icon={SearchX} size="lg" className="mb-5" />
        <h1 className="text-2xl text-text-primary mb-2">Médico no encontrado</h1>
        <p className="text-text-secondary mb-6">{error ?? 'El médico solicitado no existe.'}</p>
        <Link to="/buscar">
          <Button variant="primary" size="md">Volver al buscador</Button>
        </Link>
      </div>
    );
  }

  // ─── Success step ─────────────────────────────────────────────────────────
  if (step === 'success' && bookedAppointment) {
    return (
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
        <div className="bg-surface-card border border-line rounded-2xl p-8 text-center">
          <IconBadge icon={CalendarCheck} tone="success" size="lg" className="mb-5" />
          <h1 className="text-2xl text-text-primary mb-2">
            ¡Cita agendada!
          </h1>
          <p className="text-text-secondary mb-6">
            {bookedAppointment.familiarNombre
              ? `La cita de ${bookedAppointment.familiarNombre} ha sido confirmada exitosamente.`
              : 'Tu cita ha sido confirmada exitosamente.'}
          </p>

          <div className="bg-surface-muted rounded-xl p-6 text-left space-y-3 mb-6">
            <InfoRow label="Paciente" value={bookedAppointment.familiarNombre ?? (profile?.fullName || 'Tú')} />
            <InfoRow label="Médico" value={bookedAppointment.doctorName} />
            <InfoRow label="Especialidad" value={bookedAppointment.specialtyName} />
            <InfoRow label="EPS" value={bookedAppointment.epsName} />
            <InfoRow label="Fecha" value={formatDateLong(bookedAppointment.slotDate)} />
            <InfoRow label="Hora" value={`${formatTime(bookedAppointment.slotStartTime)} - ${formatTime(bookedAppointment.slotEndTime)}`} />
            <InfoRow label="Modalidad" value={bookedAppointment.mode === 'presencial' ? 'Presencial' : 'Telemedicina'} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/dashboard" className="flex-1">
              <Button variant="primary" size="md" fullWidth>
                Ir a mi panel
              </Button>
            </Link>
            <Link to="/buscar" className="flex-1">
              <Button variant="secondary" size="md" fullWidth>
                Agendar otra cita
              </Button>
            </Link>
          </div>
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
          className="inline-flex items-center gap-1 min-h-11 -ml-1 px-1 rounded-lg text-sm text-text-muted hover:text-text-primary font-medium mb-4 cursor-pointer"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Cambiar horario
        </button>

        <h1 className="text-2xl text-text-primary mb-6">
          Confirmar cita
        </h1>

        <div className="bg-surface-card border border-line rounded-2xl p-6 space-y-6">
          {/* Resumen */}
          <div className="bg-surface-muted rounded-xl p-5 space-y-3">
            {paciente && <InfoRow label="Paciente" value={nombrePaciente} />}
            <InfoRow label="Médico" value={doctor.fullName} />
            <InfoRow label="Especialidad" value={doctor.specialtyName} />
            <InfoRow label="EPS" value={doctor.epsName} />
            <InfoRow label="Fecha" value={formatDateLong(selectedSlot.date)} />
            <InfoRow label="Hora" value={`${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}`} />
          </div>

          {/* ¿Para quién es la cita? (RF-13) */}
          {conFamilia && (
            <fieldset>
              <legend className="text-sm font-medium text-text-secondary mb-2">¿Para quién es la cita?</legend>
              <div className="space-y-2">
                {opcionesPaciente.map((opcion) => {
                  const elegida = opcion.clave === clavePaciente;
                  return (
                    <label
                      key={opcion.clave}
                      className={`flex items-start gap-3 rounded-xl border-2 p-3 ${
                        opcion.habilitada ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                      } ${elegida ? 'border-accent bg-accent-soft' : 'border-line-input'}`}
                    >
                      <input
                        type="radio"
                        name="paciente"
                        value={opcion.clave}
                        checked={elegida}
                        disabled={!opcion.habilitada}
                        onChange={() => setPacienteElegido(opcion.clave)}
                        className="mt-1 h-5 w-5 shrink-0 accent-brand"
                      />
                      <span className="flex flex-col font-medium text-text-primary">
                        {opcion.nombre}
                        <span className="text-sm font-normal text-text-secondary">
                          {opcion.detalle}
                          {!opcion.habilitada && ' · no pertenece a la EPS de este médico'}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {!paciente && (
            <p role="alert" className="bg-warning-soft border border-warning/30 text-text-primary text-sm px-4 py-3 rounded-xl">
              Este médico atiende afiliados de {doctor.epsName}.{' '}
              {conFamilia
                ? 'Ni tú ni tus familiares registrados tienen esa EPS.'
                : profile?.epsId ? 'Tu EPS es distinta.' : 'Tu perfil aún no tiene EPS: regístrala en «Tu información», en tu panel.'}{' '}
              <Link to="/buscar" className="font-semibold text-accent underline underline-offset-4">Buscar otro médico</Link>
            </p>
          )}

          {/* Modo */}
          <AppointmentModeSelector value={mode} onChange={setMode} />

          {/* Notas */}
          <div>
            <label htmlFor="notes" className="text-sm font-medium text-text-secondary mb-2 block">
              Notas adicionales (opcional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe brevemente el motivo de tu consulta..."
              rows={3}
              maxLength={500}
              className="control-campo resize-none"
            />
          </div>

          {/* Error */}
          {bookingError && (
            <div role="alert" className="bg-error-soft border border-error/30 text-error text-sm font-medium px-4 py-3 rounded-xl">
              {bookingError}
            </div>
          )}

          {/* Submit */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isBooking}
            disabled={!paciente}
            onClick={() => { void handleBook(); }}
          >
            {paciente?.familiarId ? `Confirmar y agendar la cita de ${paciente.nombre.split(' ')[0]}` : 'Confirmar y agendar cita'}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Select step (default) ────────────────────────────────────────────────
  const initials = doctor.fullName
    .split(' ')
    .filter((_, i) => i === 0 || i === 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-surface-muted border-b border-line">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/buscar"
            className="inline-flex items-center gap-1 min-h-11 -ml-1 px-1 rounded-lg text-sm text-text-muted hover:text-text-primary font-medium mb-3"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Volver al buscador
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-soft text-accent border border-accent/20 font-bold text-xl flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl text-text-primary">
                {doctor.fullName}
              </h1>
              <p className="text-accent font-medium">{doctor.specialtyName}</p>
              <p className="text-sm text-text-muted">{doctor.epsName} · Reg. {doctor.licenseNumber}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Date picker */}
        <h2 className="font-sans text-lg font-semibold text-text-primary mb-4">
          Selecciona una fecha
        </h2>

        {availableDates.length === 0 ? (
          <div className="bg-surface-card border border-line rounded-2xl p-8 text-center mb-8">
            <IconBadge icon={CalendarX} size="md" className="mb-4" />
            <p className="text-text-secondary">No hay horarios disponibles en los próximos 14 días.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide" role="listbox" aria-label="Fechas disponibles">
              {availableDates.map((date) => {
                const isSelected = date === activeDate;
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
                    className={`flex flex-col items-center px-4 py-3 rounded-xl border-2 min-w-18 shrink-0 presionable cursor-pointer ${
                      isSelected
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line-input text-text-secondary hover:border-text-muted hover:text-text-primary'
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
            <h2 className="font-sans text-lg font-semibold text-text-primary mb-4">
              Horarios disponibles — {formatDateLong(activeDate)}
            </h2>

            {currentSlots.length === 0 ? (
              <div className="bg-surface-card border border-line rounded-xl p-6 text-center">
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
                      className={`min-h-12 py-3 px-2 rounded-xl border-2 text-sm font-medium tabular-nums presionable cursor-pointer ${
                        isSelected
                          ? 'border-brand bg-brand text-white shadow-button'
                          : 'border-line-input text-text-secondary hover:border-accent/60 hover:bg-accent-soft hover:text-text-primary'
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
              <div className="sticky bottom-4 bg-surface-card/95 backdrop-blur-md border border-line rounded-2xl p-4 shadow-elevated flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {formatDateLong(selectedSlot.date)}, {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                  </p>
                  <p className="text-xs text-text-muted">{doctor.fullName} · {doctor.specialtyName}</p>
                </div>
                <Button variant="primary" size="md" onClick={handleConfirm}>
                  Continuar
                  <ArrowRight size={16} aria-hidden="true" />
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
      <span className="text-sm font-medium text-text-primary">{value}</span>
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
