/**
 * Título de la pestaña de cada vista (WCAG 2.4.2, H-54).
 *
 * Todas las páginas compartían el título de la portada: un lector de pantalla,
 * el historial y las pestañas no decían en qué vista estaba la persona. El
 * nombre de la vista va primero, que es lo que se alcanza a leer en una pestaña
 * angosta, y después el del sitio.
 */
const SITIO = 'CitasYA';

/** La portada conserva el título descriptivo del sitio (es el que indexan los buscadores). */
export const TITULO_PORTADA = 'CitasYA — Agenda tu cita médica en Bogotá';

const TITULOS: ReadonlyArray<readonly [patron: RegExp, titulo: string]> = [
  [/^\/iniciar-sesion$/, 'Iniciar sesión'],
  [/^\/registrarse$/, 'Crear cuenta'],
  [/^\/buscar$/, 'Agendar cita'],
  [/^\/buscar\/[^/]+$/, 'Elegir fecha y hora'],
  [/^\/directorio-eps$/, 'Directorio de EPS'],
  [/^\/dashboard$/, 'Mi panel'],
  [/^\/dashboard\/historial$/, 'Mis citas'],
  [/^\/dashboard\/familia$/, 'Mi familia'],
  [/^\/reprogramar\/[^/]+$/, 'Reprogramar cita'],
  [/^\/admin$/, 'Panel de administración'],
  [/^\/admin\/medicos$/, 'Gestión de médicos'],
  [/^\/admin\/disponibilidad$/, 'Gestión de disponibilidad'],
  [/^\/admin\/citas$/, 'Todas las citas'],
  [/^\/admin\/fhir$/, 'Interoperabilidad HL7 FHIR'],
];

export function tituloDeRuta(pathname: string): string {
  // "/buscar/" y "/buscar" son la misma vista.
  const ruta = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (ruta === '/' || ruta === '') return TITULO_PORTADA;
  const vista = TITULOS.find(([patron]) => patron.test(ruta))?.[1] ?? 'Página no encontrada';
  return `${vista} · ${SITIO}`;
}
