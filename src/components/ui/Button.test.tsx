import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { describeViolations, findA11yViolations } from '@/test/axe';

describe('Button', () => {
  it('ejecuta la acción al activarse con teclado (WCAG 2.1.1)', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Agendar cita</Button>);
    screen.getByRole('button', { name: 'Agendar cita' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('en estado de carga se deshabilita y anuncia el progreso a lectores de pantalla', async () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Confirmar
      </Button>,
    );
    const button = screen.getByRole('button', { name: /confirmar/i });
    expect(button).toBeDisabled();
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('no presenta violaciones WCAG 2.1 A/AA', async () => {
    const { container } = render(
      <div>
        <Button>Primario</Button>
        <Button variant="danger" isLoading>
          Cancelar
        </Button>
      </div>,
    );
    const violations = await findA11yViolations(container);
    expect(violations, describeViolations(violations)).toHaveLength(0);
  });
});
