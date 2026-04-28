import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
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
