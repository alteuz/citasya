import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminService, type AdminDoctor, type AdminSlot, type GenerateSlotsInput } from '@/services/admin.service';

export function AdminSlotsPage() {
  const [doctors, setDoctors] = useState<readonly AdminDoctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [slots, setSlots] = useState<readonly AdminSlot[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Generate form
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startHour, setStartHour] = useState(7);
  const [endHour, setEndHour] = useState(17);
  const [duration, setDuration] = useState(30);
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDoctors() {
      const result = await AdminService.getAllDoctors();
      if (result.success) setDoctors(result.data.filter((d) => d.active));
      setIsLoadingDoctors(false);
    }
    void loadDoctors();
  }, []);

  const loadSlots = useCallback(async (doctorId: string) => {
    if (!doctorId) {
      setSlots([]);
      return;
    }
    setIsLoadingSlots(true);
    const result = await AdminService.getDoctorSlots(doctorId);
    if (result.success) setSlots(result.data);
    setIsLoadingSlots(false);
  }, []);

  const handleDoctorChange = useCallback((id: string) => {
    setSelectedDoctor(id);
    void loadSlots(id);
  }, [loadSlots]);

  const handleGenerate = useCallback(async () => {
    if (!selectedDoctor || !startDate || !endDate) {
      setGenError('Selecciona un médico y rango de fechas.');
      return;
    }

    setIsGenerating(true);
    setGenError(null);
    setGenResult(null);

    const input: GenerateSlotsInput = {
      doctorId: selectedDoctor,
      startDate,
      endDate,
      startHour,
      endHour,
      slotDurationMinutes: duration,
      excludeWeekends,
    };

    const result = await AdminService.generateSlots(input);
    setIsGenerating(false);

    if (!result.success) {
      setGenError(result.error);
      return;
    }

    setGenResult(`✅ Se generaron ${result.data} slots exitosamente.`);
    void loadSlots(selectedDoctor);
  }, [selectedDoctor, startDate, endDate, startHour, endHour, duration, excludeWeekends, loadSlots]);

  const handleDelete = useCallback(async (slotId: string) => {
    setDeletingId(slotId);
    const result = await AdminService.deleteSlot(slotId);
    setDeletingId(null);

    if (result.success) {
      void loadSlots(selectedDoctor);
    } else {
      alert(result.error);
    }
  }, [selectedDoctor, loadSlots]);

  // Agrupar slots por fecha para visualización
  const slotsByDate = new Map<string, AdminSlot[]>();
  for (const slot of slots) {
    const existing = slotsByDate.get(slot.date) ?? [];
    existing.push(slot);
    slotsByDate.set(slot.date, existing);
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-primary-50 border-b border-primary-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/admin" className="text-sm text-text-muted hover:text-primary-700 font-medium mb-4 flex items-center gap-1">
            <span aria-hidden="true">←</span> Volver al panel
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
            Gestión de Disponibilidad 📋
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Doctor Selector */}
        <div className="mb-6">
          <label htmlFor="slot-doctor" className="text-sm font-medium text-text-secondary block mb-2">
            Seleccionar médico
          </label>
          {isLoadingDoctors ? (
            <Skeleton height="48px" rounded="xl" />
          ) : (
            <select
              id="slot-doctor"
              value={selectedDoctor}
              onChange={(e) => handleDoctorChange(e.target.value)}
              className="w-full max-w-md rounded-xl border border-primary-200 bg-surface-card px-4 py-3 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-400 transition-colors"
            >
              <option value="">Seleccionar médico...</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName} — {d.specialtyName}</option>
              ))}
            </select>
          )}
        </div>

        {selectedDoctor && (
          <>
            {/* Generate Form */}
            <div className="bg-surface-card border border-primary-100 rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-primary-800 mb-4">Generar slots en lote</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="gen-start" className="text-sm font-medium text-text-secondary block mb-1">Fecha inicio</label>
                  <input id="gen-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-primary-200 bg-surface-card px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent-400 transition-colors" />
                </div>
                <div>
                  <label htmlFor="gen-end" className="text-sm font-medium text-text-secondary block mb-1">Fecha fin</label>
                  <input id="gen-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-primary-200 bg-surface-card px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent-400 transition-colors" />
                </div>
                <div>
                  <label htmlFor="gen-duration" className="text-sm font-medium text-text-secondary block mb-1">Duración (minutos)</label>
                  <select id="gen-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-primary-200 bg-surface-card px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent-400 transition-colors">
                    <option value={15}>15 min</option>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="gen-start-h" className="text-sm font-medium text-text-secondary block mb-1">Hora inicio</label>
                  <select id="gen-start-h" value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}
                    className="w-full rounded-xl border border-primary-200 bg-surface-card px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent-400 transition-colors">
                    {Array.from({ length: 14 }, (_, i) => i + 6).map((h) => (
                      <option key={h} value={h}>{h}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="gen-end-h" className="text-sm font-medium text-text-secondary block mb-1">Hora fin</label>
                  <select id="gen-end-h" value={endHour} onChange={(e) => setEndHour(Number(e.target.value))}
                    className="w-full rounded-xl border border-primary-200 bg-surface-card px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent-400 transition-colors">
                    {Array.from({ length: 14 }, (_, i) => i + 7).map((h) => (
                      <option key={h} value={h}>{h}:00</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer py-3">
                    <input type="checkbox" checked={excludeWeekends} onChange={(e) => setExcludeWeekends(e.target.checked)}
                      className="w-5 h-5 rounded border-primary-300 text-accent-400 focus:ring-accent-400" />
                    <span className="text-sm text-text-secondary">Excluir fines de semana</span>
                  </label>
                </div>
              </div>

              {genError && (
                <div role="alert" className="bg-red-50 border border-error/20 text-error text-sm font-medium px-4 py-3 rounded-xl mt-4">
                  {genError}
                </div>
              )}
              {genResult && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-3 rounded-xl mt-4">
                  {genResult}
                </div>
              )}

              <div className="mt-4">
                <Button variant="accent" size="md" isLoading={isGenerating} onClick={() => { void handleGenerate(); }}>
                  Generar slots
                </Button>
              </div>
            </div>

            {/* Slots List */}
            <h2 className="text-lg font-semibold text-primary-800 mb-4">
              Slots existentes ({slots.length})
            </h2>

            {isLoadingSlots ? (
              <div className="space-y-4">
                {[1, 2].map((i) => <Skeleton key={i} height="100px" rounded="xl" />)}
              </div>
            ) : slots.length === 0 ? (
              <div className="bg-surface-card border border-primary-100 rounded-2xl p-8 text-center text-text-muted">
                No hay slots para este médico. Genera nuevos slots arriba.
              </div>
            ) : (
              <div className="space-y-6">
                {Array.from(slotsByDate.entries()).map(([date, dateSlots]) => (
                  <div key={date} className="bg-surface-card border border-primary-100 rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-primary-800 mb-3">
                      📅 {formatDateLong(date)} ({dateSlots.length} slots)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {dateSlots.map((slot) => (
                        <div key={slot.id} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                          slot.isBooked
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-green-50 border-green-200 text-green-700'
                        }`}>
                          <span>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                          {slot.isBooked ? (
                            <span className="text-red-400">🔒</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { void handleDelete(slot.id); }}
                              disabled={deletingId === slot.id}
                              className="text-red-400 hover:text-red-600 ml-1 cursor-pointer"
                              aria-label="Eliminar slot"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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

function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
