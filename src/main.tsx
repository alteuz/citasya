import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
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

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
