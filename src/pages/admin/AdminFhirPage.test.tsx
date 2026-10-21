import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AdminFhirPage } from './AdminFhirPage';
import { FhirService, type ResumenFhir } from '@/services/fhir.service';
import { describeViolations, findA11yViolations } from '@/test/axe';

vi.mock('@/services/fhir.service', () => ({
  FhirService: { resumen: vi.fn(), ejecutar: vi.fn() },
}));

const SERVIDOR = 'https://hapi.fhir.org/baseR4';

const resumen: ResumenFhir = {
  estados: { publicado: 2, pendiente: 1, conflicto: 1 },
  recursos: { Organization: 21, Location: 32, Practitioner: 135, PractitionerRole: 135, Schedule: 135, Slot: 2, Patient: 1, Appointment: 2 },
  servidor: SERVIDOR,
  eventos: [
    {
      id: 3, citaId: '25f1347a-c150-4f0e-a757-c38ba1a37bb3', estado: 'publicado', intentos: 1,
      creadoEn: '2026-10-20T23:58:00Z', procesadoEn: '2026-10-20T23:58:02Z', error: null, servidor: SERVIDOR,
      appointment: { id: 'citasya-cita-25f1347a-c150-4f0e-a757-c38ba1a37bb3', version: '2' },
    },
    {
      id: 2, citaId: '0b5a7c1e-1111-4222-8333-944455556666', estado: 'conflicto', intentos: 1,
      creadoEn: '2026-10-20T22:10:00Z', procesadoEn: '2026-10-20T22:10:03Z', servidor: SERVIDOR, appointment: null,
      error: 'La franja citasya-franja-x ya está tomada en el servidor FHIR por Appointment/otra.',
    },
  ],
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminFhirPage />
    </MemoryRouter>,
  );

describe('AdminFhirPage (ADR-0009)', () => {
  beforeEach(() => {
    vi.mocked(FhirService.resumen).mockReset();
    vi.mocked(FhirService.ejecutar).mockReset();
    vi.mocked(FhirService.resumen).mockResolvedValue({ success: true, data: resumen });
  });

  it('muestra el servidor, los recursos publicados, el estado y cada evento con su enlace al recurso FHIR', async () => {
    renderPage();

    expect(await screen.findByRole('link', { name: /hapi\.fhir\.org\/baseR4/ })).toHaveAttribute('href', `${SERVIDOR}/metadata`);
    const estado = within(screen.getByRole('region', { name: 'Estado de la publicación' }));
    expect(estado.getByText('Publicadas').closest('div')).toHaveTextContent('2');
    expect(estado.getByText('En conflicto').closest('div')).toHaveTextContent('1');

    const filas = within(screen.getByRole('table')).getAllByRole('row');
    expect(filas).toHaveLength(3);
    expect(within(filas[1] as HTMLElement).getByText('Publicada')).toBeInTheDocument();
    expect(within(filas[1] as HTMLElement).getByRole('link', { name: /Ver Appointment \(v2\)/ })).toHaveAttribute(
      'href', `${SERVIDOR}/Appointment/citasya-cita-25f1347a-c150-4f0e-a757-c38ba1a37bb3/_history/2`,
    );
    expect(within(filas[2] as HTMLElement).getByText('En conflicto')).toBeInTheDocument();
    expect(within(filas[2] as HTMLElement).getByText(/ya está tomada/)).toBeInTheDocument();
  });

  it('«Sincronizar ahora» publica, avisa el resultado y recarga el resumen', async () => {
    vi.mocked(FhirService.ejecutar).mockResolvedValue({
      success: true,
      data: { servidor: SERVIDOR, procesados: 1, publicados: 1, pendientes: 0, conflictos: 0, fallidos: 0 },
    });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Sincronizar ahora' }));
    expect(FhirService.ejecutar).toHaveBeenCalledWith('sincronizar');
    expect(await screen.findByRole('status')).toHaveTextContent('Se procesaron 1 citas: 1 publicadas');
    expect(FhirService.resumen).toHaveBeenCalledTimes(2);
  });

  it('si la acción falla, lo dice con un mensaje que se anuncia', async () => {
    vi.mocked(FhirService.ejecutar).mockResolvedValue({ success: false, error: 'Solo un administrador puede sincronizar con FHIR.' });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Publicar recursos maestros' }));
    expect(FhirService.ejecutar).toHaveBeenCalledWith('carga-inicial');
    expect(await screen.findByRole('alert')).toHaveTextContent('Solo un administrador');
  });

  it('no tiene violaciones de accesibilidad (axe)', async () => {
    const { container } = renderPage();
    await screen.findByRole('table');
    const violaciones = await findA11yViolations(container);
    expect(violaciones, describeViolations(violaciones)).toEqual([]);
  });
});
