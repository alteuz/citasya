import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AdminAppointmentsPage } from './AdminAppointmentsPage';
import { AdminService, type AdminAppointment } from '@/services/admin.service';
import type { ServiceResult } from '@/types/common';
import type { AppointmentStatus } from '@/types/database';

vi.mock('@/services/admin.service', () => ({
  AdminService: { getAllAppointments: vi.fn() },
}));

const cita = (id: string, patientName: string, status: AppointmentStatus): AdminAppointment => ({
  id,
  patientName,
  patientEmail: `${id}@ejemplo.test`,
  familiarNombre: null,
  doctorName: 'Dr. Luis Gómez',
  specialtyName: 'Cardiología',
  epsName: 'EPS de prueba',
  slotDate: '2026-10-01',
  slotStartTime: '09:00:00',
  slotEndTime: '09:30:00',
  status,
  mode: 'presencial',
  bookedAt: '2026-09-20T12:00:00Z',
});

describe('AdminAppointmentsPage', () => {
  it('indica la pestaña activa a tecnologías de asistencia (aria-pressed)', async () => {
    vi.mocked(AdminService.getAllAppointments).mockResolvedValue({ success: true, data: [] });
    render(<MemoryRouter><AdminAppointmentsPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /todas/i })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: /canceladas/i }));
    expect(screen.getByRole('button', { name: /canceladas/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /todas/i })).toHaveAttribute('aria-pressed', 'false');
  });

  // Regresión de condición de carrera: si la respuesta de la pestaña anterior
  // llega después de cambiar de pestaña, no debe mostrarse.
  it('no muestra resultados de una pestaña anterior que llegan tarde', async () => {
    let resolverTodas!: (r: ServiceResult<readonly AdminAppointment[]>) => void;
    vi.mocked(AdminService.getAllAppointments).mockImplementation((status) =>
      status === undefined
        ? new Promise((resolve) => { resolverTodas = resolve; })
        : Promise.resolve({ success: true, data: [cita('c2', 'Paciente Cancelada', 'cancelled')] }),
    );
    render(<MemoryRouter><AdminAppointmentsPage /></MemoryRouter>);

    await userEvent.click(screen.getByRole('button', { name: /canceladas/i }));
    expect(await screen.findByText('Paciente Cancelada')).toBeInTheDocument();

    await act(async () => resolverTodas({ success: true, data: [cita('c1', 'Paciente Programada', 'scheduled')] }));

    expect(screen.queryByText('Paciente Programada')).not.toBeInTheDocument();
    expect(screen.getByText('Paciente Cancelada')).toBeInTheDocument();
  });
});

// H-52: en la vista del administrador, una cita programada cuya hora ya pasó seguía
// apareciendo como «Programada». Ahora usa la misma regla que las vistas del paciente.
describe('AdminAppointmentsPage: citas vencidas', () => {
  beforeEach(() => {
    vi.mocked(AdminService.getAllAppointments).mockReset();
    // Solo se fija el reloj (no los temporizadores): 10-nov-2026, 10:00 en Bogotá.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T15:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  const vencida: AdminAppointment = { ...cita('c1', 'Paciente Vencida', 'scheduled'), slotDate: '2026-06-04' };
  const futura: AdminAppointment = { ...cita('c2', 'Paciente Futura', 'scheduled'), slotDate: '2026-12-15' };
  const fila = (paciente: string): HTMLElement => screen.getByText(paciente).closest('tr') as HTMLElement;

  it('en «Todas», la cita vencida se muestra como «Pasada» y la futura como «Programada»', async () => {
    vi.mocked(AdminService.getAllAppointments).mockResolvedValue({ success: true, data: [vencida, futura] });
    render(<MemoryRouter><AdminAppointmentsPage /></MemoryRouter>);

    expect(await screen.findByText('Paciente Vencida')).toBeInTheDocument();
    expect(within(fila('Paciente Vencida')).getByText('Pasada')).toBeInTheDocument();
    expect(within(fila('Paciente Futura')).getByText('Programada')).toBeInTheDocument();
  });

  it('la pestaña «Programadas» no incluye las citas vencidas', async () => {
    vi.mocked(AdminService.getAllAppointments).mockResolvedValue({ success: true, data: [vencida, futura] });
    render(<MemoryRouter><AdminAppointmentsPage /></MemoryRouter>);

    await userEvent.click(screen.getByRole('button', { name: /programadas/i }));

    expect(await screen.findByText('1 cita(s) encontrada(s)')).toBeInTheDocument();
    expect(screen.getByText('Paciente Futura')).toBeInTheDocument();
    expect(screen.queryByText('Paciente Vencida')).not.toBeInTheDocument();
  });
});
