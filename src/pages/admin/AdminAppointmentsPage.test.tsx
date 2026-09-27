import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
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
