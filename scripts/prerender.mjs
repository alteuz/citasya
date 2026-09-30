/**
 * Inserta el HTML prerenderizado de las rutas públicas en la plantilla del
 * build (dist/index.html) y lo escribe como dist/<ruta>.html.
 *
 * - dist/index.html se deja intacto: es el shell de la SPA para "/" y para
 *   todas las rutas no prerenderizadas (fallback de Vercel y de `serve`).
 * - Vercel sirve dist/buscar.html en /buscar gracias a "cleanUrls" (vercel.json);
 *   `serve` (npm run serve:dist) lo hace con las reescrituras de serve.json.
 *
 * Uso: vite build && vite build --ssr src/prerender.tsx --outDir dist-ssr && node scripts/prerender.mjs
 */
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = resolve('dist');
const DIST_SSR = resolve('dist-ssr');
const MARCADOR = '<div id="app"></div>';

const { prerenderizar, RUTAS_PRERENDERIZADAS } = await import(pathToFileURL(join(DIST_SSR, 'prerender.js')).href);

// serve.json (servidor local y de CI) debe reescribir cada ruta prerenderizada
// a su archivo antes del fallback de la SPA; si falta una, CI mediría el shell.
const { rewrites } = JSON.parse(await readFile(resolve('serve.json'), 'utf8'));
for (const ruta of RUTAS_PRERENDERIZADAS) {
  if (!rewrites.some((r) => r.source === ruta && r.destination === `${ruta}.html`)) {
    throw new Error(`serve.json no reescribe ${ruta} → ${ruta}.html.`);
  }
}

const plantilla = await readFile(join(DIST, 'index.html'), 'utf8');
if (!plantilla.includes(MARCADOR)) {
  throw new Error(`dist/index.html no contiene ${MARCADOR}; no se puede insertar el prerenderizado.`);
}

for (const ruta of RUTAS_PRERENDERIZADAS) {
  const html = await prerenderizar(ruta);
  if (!html.includes('<main')) {
    throw new Error(`El prerenderizado de ${ruta} no contiene <main>; revisa la ruta.`);
  }
  const destino = join(DIST, `${ruta.slice(1)}.html`);
  await writeFile(destino, plantilla.replace(MARCADOR, `<div id="app">${html}</div>`));
  console.log(`prerenderizado ${ruta} → dist/${ruta.slice(1)}.html (${(html.length / 1024).toFixed(1)} KB)`);
}

await rm(DIST_SSR, { recursive: true, force: true });
