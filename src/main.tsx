import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import { router } from './router';
// Fuentes alojadas en el mismo dominio (sin CSS de terceros que bloquee el
// renderizado ni solicitudes a Google con la IP del paciente).
import '@fontsource-variable/dm-sans/wght.css';
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import './index.css';

const rootElement = document.getElementById('app');

if (!rootElement) {
  throw new Error(
    'No se encontró el elemento #app en el DOM. Verifica que index.html contiene <div id="app"></div>.'
  );
}

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

/** Resuelve cuando el enrutador terminó de cargar el módulo de la ruta inicial. */
function esperarRutaInicial(): Promise<void> {
  if (router.state.initialized) return Promise.resolve();
  return new Promise((resolve) => {
    const cancelar = router.subscribe((estado) => {
      if (estado.initialized) {
        cancelar();
        resolve();
      }
    });
  });
}

// Las rutas públicas llegan prerenderizadas (src/prerender.tsx). Con ese HTML
// en pantalla se espera a que la ruta inicial esté cargada, para no pasar por
// una pantalla vacía, y React lo hidrata reutilizando los nodos. El
// prerenderizado corresponde a la URL sin parámetros: con parámetros (p. ej.,
// /buscar?specialty=…) el contenido inicial difiere y React lo reemplaza.
// Las demás rutas (shell vacío) se montan de inmediato.
if (rootElement.hasChildNodes()) {
  void esperarRutaInicial().then(() => {
    if (window.location.search === '') hydrateRoot(rootElement, app);
    else createRoot(rootElement).render(app);
  });
} else {
  createRoot(rootElement).render(app);
}
