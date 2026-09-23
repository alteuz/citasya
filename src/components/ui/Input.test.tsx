import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './Input';
import { describeViolations, findA11yViolations } from '@/test/axe';

describe('Input', () => {
  it('asocia la etiqueta visible al campo (WCAG 1.3.1, 3.3.2)', () => {
    render(<Input label="Número de cédula" name="cedula" />);
    expect(screen.getByLabelText('Número de cédula')).toHaveAttribute('id', 'cedula');
  });

  it('marca el campo como inválido y enlaza el mensaje de error (WCAG 3.3.1)', () => {
    render(<Input label="Correo" name="email" error="Ingresa un correo válido" />);
    const field = screen.getByLabelText('Correo');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Ingresa un correo válido');
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa un correo válido');
  });

  it('usa el texto de ayuda como descripción accesible cuando no hay error', () => {
    render(<Input label="Teléfono" name="phone" helperText="10 dígitos, sin espacios" />);
    const field = screen.getByLabelText('Teléfono');
    expect(field).not.toHaveAttribute('aria-invalid');
    expect(field).toHaveAccessibleDescription('10 dígitos, sin espacios');
  });

  it('no presenta violaciones WCAG 2.1 A/AA en ninguno de sus estados', async () => {
    const { container } = render(
      <form>
        <Input label="Nombre" name="nombre" />
        <Input label="Correo" name="correo" error="Campo obligatorio" />
        <Input label="Teléfono" name="telefono" helperText="10 dígitos" />
      </form>,
    );
    const violations = await findA11yViolations(container);
    expect(violations, describeViolations(violations)).toHaveLength(0);
  });
});
