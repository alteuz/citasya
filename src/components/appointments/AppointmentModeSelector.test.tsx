import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppointmentModeSelector } from './AppointmentModeSelector';
import type { AppointmentMode } from '@/types/database';
import { describeViolations, findA11yViolations } from '@/test/axe';

function Harness({ initial = 'presencial' }: { initial?: AppointmentMode }) {
  const [mode, setMode] = useState<AppointmentMode>(initial);
  return <AppointmentModeSelector value={mode} onChange={setMode} />;
}

describe('AppointmentModeSelector', () => {
  it('expone un grupo con nombre accesible y el estado de cada opción', () => {
    render(<Harness initial="telemedicina" />);
    expect(screen.getByRole('group', { name: 'Modalidad de atención' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Telemedicina' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Presencial' })).not.toBeChecked();
  });

  it('permite cambiar la modalidad con las flechas del teclado (WCAG 2.1.1)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Presencial' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Telemedicina' })).toBeChecked();
  });

  it('permite cambiar la modalidad con el mouse o toque', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Telemedicina'));
    expect(screen.getByRole('radio', { name: 'Telemedicina' })).toBeChecked();
  });

  it('no presenta violaciones WCAG 2.1 A/AA', async () => {
    const { container } = render(<Harness />);
    const violations = await findA11yViolations(container);
    expect(violations, describeViolations(violations)).toHaveLength(0);
  });
});
