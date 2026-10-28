import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { RegisterPage } from './RegisterPage';

const auth = vi.hoisted(() => ({ isAuthenticated: false, register: vi.fn() }));

vi.mock('@/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ register: auth.register, isLoading: false, isAuthenticated: auth.isAuthenticated }),
}));
vi.mock('@/services/doctors.service', () => ({
  DoctorsService: { getEpsList: vi.fn().mockResolvedValue({ success: true, data: [] }) },
}));
// La verificación de filtraciones consulta un servicio externo: en la prueba no se filtra nada.
vi.mock('@/lib/contrasena', async (original) => ({
  ...(await original<typeof import('@/lib/contrasena')>()),
  vecesFiltrada: vi.fn().mockResolvedValue(0),
}));

async function registrarse(): Promise<void> {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
  await user.type(screen.getByLabelText('Número de cédula'), '52123456');
  await user.type(screen.getByLabelText('Nombre completo'), 'Rosa Prueba Sintética');
  await user.click(screen.getByRole('button', { name: /siguiente/i }));
  // La contraseña no puede contener la parte local del correo (NIST): por eso no es «rosa@…».
  await user.type(screen.getByLabelText('Correo electrónico'), 'usuaria.prueba@ejemplo.test');
  await user.type(screen.getByLabelText('Contraseña'), 'mi jardín tiene tres rosas');
  await user.type(screen.getByLabelText('Confirmar contraseña'), 'mi jardín tiene tres rosas');
  await user.click(screen.getByRole('button', { name: /crear cuenta/i }));
  await screen.findByRole('heading', { name: /registro exitoso/i });
}

describe('RegisterPage: mensaje después del registro (H-51)', () => {
  beforeEach(() => {
    auth.register.mockReset().mockResolvedValue(null);
  });

  it('con la sesión ya iniciada, invita a agendar y no pide revisar un correo que no llegará', async () => {
    auth.isAuthenticated = true;
    await registrarse();
    expect(screen.getByRole('link', { name: /agendar mi primera cita/i })).toHaveAttribute('href', '/buscar');
    expect(screen.queryByText(/revisa tu correo/i)).not.toBeInTheDocument();
  });

  it('si el correo debe confirmarse, lo pide y lleva a iniciar sesión', async () => {
    auth.isAuthenticated = false;
    await registrarse();
    expect(screen.getByText(/revisa tu correo/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir a iniciar sesión/i })).toHaveAttribute('href', '/iniciar-sesion');
  });
});
