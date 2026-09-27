import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
