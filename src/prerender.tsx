/**
 * Prerenderizado estático (SSG) de las rutas públicas.
 *
 * Se compila con `vite build --ssr` y lo ejecuta scripts/prerender.mjs
 * después del build del navegador. Cada ruta se renderiza en Node con el
 * mismo árbol de componentes que usa el navegador, en su estado inicial (sesión
 * y datos "cargando"), y el HTML resultante se inserta en #app. El navegador
 * pinta ese HTML sin esperar al JavaScript y luego React lo hidrata (main.tsx).
 *
 * Motivo: en móvil, el LCP de una SPA depende de descargar y ejecutar todo el
 * JavaScript antes de mostrar texto (retraso de renderizado del 83 %, H-02).
 */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { rutas } from './rutas';

// Ruta del póster de la portada: scripts/prerender.mjs lo precarga en el <head> de "/".
export { POSTER_PORTADA } from './lib/portada';

/**
 * Rutas públicas cuyo contenido inicial no depende del usuario. La portada
 * ("/") se incorporó cuando su entrada pasó a animaciones CSS (visibles sin
 * JavaScript) y su video a un póster precargado (ADR-0007).
 */
export const RUTAS_PRERENDERIZADAS = ['/', '/iniciar-sesion', '/registrarse', '/buscar', '/directorio-eps'] as const;

export async function prerenderizar(ruta: string): Promise<string> {
  const { query, dataRoutes } = createStaticHandler(rutas);
  const contexto = await query(new Request(`http://localhost${ruta}`));

  if (contexto instanceof Response) {
    throw new Error(`La ruta ${ruta} respondió con una redirección (${contexto.status}); no se puede prerenderizar.`);
  }

  const router = createStaticRouter(dataRoutes, contexto);
  return renderToString(
    <StrictMode>
      <StaticRouterProvider router={router} context={contexto} hydrate={false} />
    </StrictMode>,
  );
}
