import { describe, expect, it } from 'vitest';
import { TITULO_PORTADA, tituloDeRuta } from './titulos';

describe('tituloDeRuta', () => {
  it('la portada conserva el título descriptivo del sitio', () => {
    expect(tituloDeRuta('/')).toBe(TITULO_PORTADA);
  });

  it('cada vista pública se identifica antes del nombre del sitio', () => {
    expect(tituloDeRuta('/iniciar-sesion')).toBe('Iniciar sesión · CitasYA');
    expect(tituloDeRuta('/registrarse')).toBe('Crear cuenta · CitasYA');
    expect(tituloDeRuta('/buscar')).toBe('Agendar cita · CitasYA');
    expect(tituloDeRuta('/directorio-eps')).toBe('Directorio de EPS · CitasYA');
  });

  it('las rutas con identificador tienen el título de su vista', () => {
    expect(tituloDeRuta('/buscar/679373f2-cb26-4c86-9ca4-0dc3a186d783')).toBe('Elegir fecha y hora · CitasYA');
    expect(tituloDeRuta('/reprogramar/1a051397-30f3-4e2e-98bf-f9a1f2d9fd79')).toBe('Reprogramar cita · CitasYA');
  });

  it('las vistas del paciente y del administrador tienen títulos distintos', () => {
    const rutas = ['/dashboard', '/dashboard/historial', '/dashboard/familia', '/admin', '/admin/medicos', '/admin/disponibilidad', '/admin/citas', '/admin/fhir'];
    const titulos = rutas.map(tituloDeRuta);
    expect(new Set(titulos).size).toBe(rutas.length);
    expect(titulos.every((t) => t.endsWith(' · CitasYA'))).toBe(true);
  });

  it('ignora la barra final y nombra las rutas que no existen', () => {
    expect(tituloDeRuta('/buscar/')).toBe('Agendar cita · CitasYA');
    expect(tituloDeRuta('/pagina-que-no-existe')).toBe('Página no encontrada · CitasYA');
  });
});
