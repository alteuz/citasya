import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { FamiliaPage } from './FamiliaPage';
import { FamiliaService } from '@/services/familia.service';
import { DoctorsService } from '@/services/doctors.service';
import type { Familiar } from '@/types/database';
import { describeViolations, findA11yViolations } from '@/test/axe';

vi.mock('@/services/familia.service', () => ({
  FamiliaService: { listar: vi.fn(), guardar: vi.fn(), retirar: vi.fn() },
}));
vi.mock('@/services/doctors.service', () => ({
  DoctorsService: { getEpsList: vi.fn() },
}));
vi.mock('@/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ profile: { epsId: 'eps-a', epsName: 'EPS A', fullName: 'Ana Titular' } }),
}));

const hijo: Familiar = {
  id: 'f-hijo', nombreCompleto: 'Samuel Pérez', tipoDocumento: 'TI', numeroDocumento: '1012345678',
  fechaNacimiento: '2015-05-10', parentesco: 'hijo', epsId: 'eps-a', epsName: 'EPS A',
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <FamiliaPage />
    </MemoryRouter>,
  );

describe('FamiliaPage (RF-13)', () => {
  beforeEach(() => {
    vi.mocked(FamiliaService.listar).mockReset();
    vi.mocked(FamiliaService.guardar).mockReset();
    vi.mocked(DoctorsService.getEpsList).mockResolvedValue({
      success: true,
      data: [{ id: 'eps-a', name: 'EPS A' }, { id: 'eps-b', name: 'EPS B' }],
    });
  });

  it('muestra a cada familiar con su EPS y un acceso directo para pedirle cita', async () => {
    vi.mocked(FamiliaService.listar).mockResolvedValue({ success: true, data: [hijo] });
    renderPage();

    const tarjeta = (await screen.findByRole('heading', { name: 'Samuel Pérez' })).closest('li');
    expect(tarjeta).not.toBeNull();
    const enTarjeta = within(tarjeta as HTMLElement);
    expect(enTarjeta.getByText('EPS A')).toBeInTheDocument();
    const pedir = enTarjeta.getByRole('link', { name: /Pedir cita/ });
    expect(pedir).toHaveAccessibleName('Pedir cita para Samuel Pérez');
    expect(pedir).toHaveAttribute('href', '/buscar?para=f-hijo');
  });

  it('valida el formulario, lleva el foco al primer error y registra al familiar', async () => {
    vi.mocked(FamiliaService.listar).mockResolvedValue({ success: true, data: [] });
    vi.mocked(FamiliaService.guardar).mockResolvedValue({ success: true, data: 'f-nuevo' });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Agregar familiar/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar familiar' }));

    const nombre = screen.getByLabelText('Nombre completo');
    expect(nombre).toHaveAttribute('aria-invalid', 'true');
    expect(nombre).toHaveFocus();
    expect(FamiliaService.guardar).not.toHaveBeenCalled();

    await user.type(nombre, 'Gloria  Lugo');
    await user.selectOptions(screen.getByLabelText('Parentesco'), 'padre_madre');
    await user.type(screen.getByLabelText('Fecha de nacimiento'), '1955-03-02');
    // La fecha sugiere el documento según la edad (adulta: cédula).
    expect(screen.getByLabelText('Tipo de documento')).toHaveValue('CC');
    await user.type(screen.getByLabelText('Número de documento'), '41234567');
    await user.selectOptions(screen.getByLabelText('EPS de tu familiar'), 'eps-b');
    await user.click(screen.getByLabelText(/Soy su representante legal/));
    await user.click(screen.getByRole('button', { name: 'Guardar familiar' }));

    expect(FamiliaService.guardar).toHaveBeenCalledWith(
      {
        nombreCompleto: 'Gloria Lugo',
        tipoDocumento: 'CC',
        numeroDocumento: '41234567',
        fechaNacimiento: '1955-03-02',
        parentesco: 'padre_madre',
        epsId: 'eps-b',
        autorizacion: true,
      },
      undefined,
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Registramos a Gloria Lugo en tu familia.');
  });

  it('no tiene violaciones WCAG 2.1 A/AA en la lista ni en el formulario', async () => {
    vi.mocked(FamiliaService.listar).mockResolvedValue({ success: true, data: [hijo] });
    const user = userEvent.setup();
    const { container } = renderPage();

    await screen.findByRole('heading', { name: 'Samuel Pérez' });
    let violaciones = await findA11yViolations(container);
    expect(violaciones, describeViolations(violaciones)).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /Agregar familiar/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar familiar' })); // deja los errores visibles
    violaciones = await findA11yViolations(container);
    expect(violaciones, describeViolations(violaciones)).toHaveLength(0);
  });
});
