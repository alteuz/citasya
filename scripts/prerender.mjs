/**
 * Inserta el HTML prerenderizado de las rutas públicas en la plantilla del
 * build (dist/index.html) y lo escribe como archivos estáticos.
 *
 * - La plantilla sin contenido se guarda como dist/spa.html: es el shell de la
 *   SPA para todas las rutas no prerenderizadas (fallback de Vercel → "/spa" y
 *   de `serve` → "/spa.html"). Así una ruta privada nunca recibe el HTML de otra
 *   página que React tendría que descartar.
 * - "/" se escribe en dist/index.html (la portada) y, además, precarga su
 *   póster, que es el elemento LCP (ADR-0007).
 * - Las demás rutas se escriben como dist/<ruta>.html: Vercel las sirve gracias a
 *   "cleanUrls" (vercel.json); `serve` (npm run serve:dist), con las reescrituras
 *   de serve.json.
 *
 * Uso: vite build && vite build --ssr src/prerender.tsx --outDir dist-ssr && node scripts/prerender.mjs
 */
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = resolve('dist');
const DIST_SSR = resolve('dist-ssr');
const MARCADOR = '<div id="app"></div>';
const SHELL = 'spa.html';

const { prerenderizar, RUTAS_PRERENDERIZADAS, POSTER_PORTADA } = await import(pathToFileURL(join(DIST_SSR, 'prerender.js')).href);

// serve.json (servidor local y de CI) debe reescribir cada ruta prerenderizada
// a su archivo antes del fallback de la SPA, y el fallback debe ir al shell; si
// no, CI mediría una página distinta de la que sirve producción.
const { rewrites } = JSON.parse(await readFile(resolve('serve.json'), 'utf8'));
for (const ruta of RUTAS_PRERENDERIZADAS) {
  if (ruta === '/') continue; // `serve` entrega index.html en "/" sin reescritura
  if (!rewrites.some((r) => r.source === ruta && r.destination === `${ruta}.html`)) {
    throw new Error(`serve.json no reescribe ${ruta} → ${ruta}.html.`);
  }
}
if (!rewrites.some((r) => r.destination === `/${SHELL}`)) {
  throw new Error(`serve.json no tiene un fallback hacia /${SHELL}.`);
}
const { rewrites: reescriturasVercel = [] } = JSON.parse(await readFile(resolve('vercel.json'), 'utf8'));
if (!reescriturasVercel.some((r) => r.destination === `/${SHELL.replace('.html', '')}`)) {
  throw new Error(`vercel.json no tiene un fallback hacia /${SHELL.replace('.html', '')} (cleanUrls).`);
}

const plantilla = await readFile(join(DIST, 'index.html'), 'utf8');
if (!plantilla.includes(MARCADOR)) {
  throw new Error(`dist/index.html no contiene ${MARCADOR}; no se puede insertar el prerenderizado.`);
}
await writeFile(join(DIST, SHELL), plantilla);
console.log(`shell de la SPA → dist/${SHELL}`);

for (const ruta of RUTAS_PRERENDERIZADAS) {
  const html = await prerenderizar(ruta);
  if (!html.includes('<main')) {
    throw new Error(`El prerenderizado de ${ruta} no contiene <main>; revisa la ruta.`);
  }
  let pagina = plantilla.replace(MARCADOR, `<div id="app">${html}</div>`);
  if (ruta === '/') {
    const precarga = `<link rel="preload" as="image" href="${POSTER_PORTADA}" type="image/webp" fetchpriority="high" />`;
    pagina = pagina.replace('</head>', `    ${precarga}\n  </head>`);
  }
  const archivo = ruta === '/' ? 'index.html' : `${ruta.slice(1)}.html`;
  await writeFile(join(DIST, archivo), pagina);
  console.log(`prerenderizado ${ruta} → dist/${archivo} (${(html.length / 1024).toFixed(1)} KB)`);
}

await rm(DIST_SSR, { recursive: true, force: true });
