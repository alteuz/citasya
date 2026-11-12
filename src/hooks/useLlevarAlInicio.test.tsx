import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useLlevarAlInicio } from './useLlevarAlInicio';

function Flujo({ paso, conTitulo = true }: { readonly paso: string; readonly conTitulo?: boolean }) {
  useLlevarAlInicio(paso);
  return (
    <main id="main-content" tabIndex={-1}>
      {conTitulo && <h1>{paso}</h1>}
    </main>
  );
}

// H-53 y H-55: al cambiar de paso, la persona ve el resultado desde arriba y el
// lector de pantalla lo anuncia porque el foco pasa al título.
describe('useLlevarAlInicio', () => {
  // jsdom no implementa scrollTo: se reemplaza para observar la llamada.
  const scrollTo = vi.fn();
  beforeEach(() => {
    scrollTo.mockReset();
    vi.stubGlobal('scrollTo', scrollTo);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('no actúa al montar: la llegada a la página la maneja el cambio de ruta', () => {
    render(<Flujo paso="elegir" />);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(screen.getByRole('heading')).not.toHaveFocus();
  });

  it('al cambiar de paso lleva la vista arriba y enfoca el título', () => {
    const { rerender } = render(<Flujo paso="elegir" />);
    rerender(<Flujo paso="confirmar" />);

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    const titulo = screen.getByRole('heading', { name: 'confirmar' });
    expect(titulo).toHaveFocus();
    // El título recibe foco sin entrar al orden del tabulador.
    expect(titulo).toHaveAttribute('tabindex', '-1');
  });

  it('si la vista aún no tiene título (está cargando), enfoca el contenido principal', () => {
    const { rerender } = render(<Flujo paso="elegir" conTitulo={false} />);
    rerender(<Flujo paso="confirmar" conTitulo={false} />);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('no repite la acción si el paso no cambió', () => {
    const { rerender } = render(<Flujo paso="elegir" />);
    rerender(<Flujo paso="elegir" />);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
