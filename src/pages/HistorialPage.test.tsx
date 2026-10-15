import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HistorialPage } from './HistorialPage';
import { AppointmentsService, type AppointmentDetail } from '@/services/appointments.service';

vi.mock('@/services/appointments.service', () => ({
  AppointmentsService: { getMyAppointments: vi.fn(), cancelAppointment: vi.fn() },
}));

const cita: AppointmentDetail = {
  id: 'cita-1',
  status: 'completed',
  mode: 'presencial',
  notes: null,
  bookedAt: '2026-09-01T10:00:00Z',
  cancelledAt: null,
  cancellationReason: null,
  doctorName: 'Dra. Ana Pérez',
  specialtyName: 'Medicina general',
  epsName: 'EPS de prueba',
  slotDate: '2026-09-10',
  slotStartTime: '08:00:00',
  slotEndTime: '08:30:00',
  doctorId: 'medico-1',
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <HistorialPage />
    </MemoryRouter>,
  );

describe('HistorialPage', () => {
  beforeEach(() => vi.mocked(AppointmentsService.getMyAppointments).mockReset());

  it('muestra las citas del paciente', async () => {
    vi.mocked(AppointmentsService.getMyAppointments).mockResolvedValue({ success: true, data: [cita] });
    renderPage();
    expect(await screen.findByText('Dra. Ana Pérez')).toBeInTheDocument();
  });

  // Regresión: antes, "Reintentar" nunca limpiaba el error y la lista no
  // aparecía aunque la segunda carga fuera exitosa.
  it('"Reintentar" recupera la lista después de un fallo', async () => {
    vi.mocked(AppointmentsService.getMyAppointments)
      .mockResolvedValueOnce({ success: false, error: 'No fue posible cargar tus citas.' })
      .mockResolvedValueOnce({ success: true, data: [cita] });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Dra. Ana Pérez')).toBeInTheDocument();
    expect(screen.queryByText('No fue posible cargar tus citas.')).not.toBeInTheDocument();
  });
});

// H-36: una cita programada cuya hora ya pasó no es «próxima» ni se puede cancelar.
describe('HistorialPage: citas pasadas y plazo de 24 horas', () => {
  beforeEach(() => {
    vi.mocked(AppointmentsService.getMyAppointments).mockReset();
    // Solo se fija el reloj (no los temporizadores): 15-oct-2026, 10:00 en Bogotá.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T15:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  const programada = (id: string, medico: string, fecha: string, inicio: string, fin: string): AppointmentDetail => ({
    ...cita,
    id,
    status: 'scheduled',
    doctorName: medico,
    slotDate: fecha,
    slotStartTime: inicio,
    slotEndTime: fin,
  });

  it('una cita programada vencida pasa al historial como «Pasada» y sin acciones', async () => {
    vi.mocked(AppointmentsService.getMyAppointments).mockResolvedValue({
      success: true,
      data: [programada('vencida', 'Dra. Alicia Díaz', '2026-06-04', '09:00:00', '09:30:00')],
    });
    renderPage();

    const historial = await screen.findByRole('region', { name: /Historial/ });
    expect(within(historial).getByText('Dra. Alicia Díaz')).toBeInTheDocument();
    expect(within(historial).getByText('Pasada')).toBeInTheDocument();
    expect(screen.getByText('No tienes citas próximas.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).not.toBeInTheDocument();
  });

  it('una cita con más de 24 horas de anticipación es próxima y se puede reprogramar o cancelar', async () => {
    vi.mocked(AppointmentsService.getMyAppointments).mockResolvedValue({
      success: true,
      data: [programada('futura', 'Dr. Pedro Hernández', '2026-10-20', '08:30:00', '09:00:00')],
    });
    renderPage();

    const proximas = await screen.findByRole('region', { name: /Próximas citas/ });
    expect(within(proximas).getByText('Dr. Pedro Hernández')).toBeInTheDocument();
    expect(within(proximas).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(within(proximas).getByRole('button', { name: 'Reprogramar' })).toBeInTheDocument();
  });

  it('a menos de 24 horas la cita sigue siendo próxima, pero sin acciones y con el motivo', async () => {
    vi.mocked(AppointmentsService.getMyAppointments).mockResolvedValue({
      success: true,
      data: [programada('manana', 'Dra. María Romero', '2026-10-16', '08:00:00', '08:30:00')],
    });
    renderPage();

    const proximas = await screen.findByRole('region', { name: /Próximas citas/ });
    expect(within(proximas).getByText('Dra. María Romero')).toBeInTheDocument();
    expect(within(proximas).getByText(/Faltan menos de 24 horas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
  });
});
