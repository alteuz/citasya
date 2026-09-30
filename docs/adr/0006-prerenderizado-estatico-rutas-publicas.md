# ADR-0006 — Prerenderizado estático (SSG) de las rutas públicas

- **Estado:** Aceptada
- **Fecha:** 2026-09-27
- **Trazabilidad:** H-02 (LCP móvil > 2,5 s) · OE-1 · pilar JAMstack · relacionada con ADR-0001 (mantener Vite) y ADR-0003 (medir → corregir → bloquear)

## Contexto

Después de reducir imágenes y dividir el código por rutas, el LCP móvil seguía entre 2,45 y 2,78 s, por encima del umbral de 2,5 s. Según Lighthouse, el 83 % de ese tiempo era *retraso de renderizado*: el elemento LCP es texto (el título o el párrafo del encabezado de cada página), pero en una SPA ese texto no existe hasta que se descarga, analiza y ejecuta el JavaScript.

Primero se probó una alternativa (experimento 08): cargar Supabase de forma diferida. El JavaScript inicial bajó 34 %, pero el LCP no mejoró (2,61 → 2,75 s de promedio). La lección fue que mientras el texto dependa del JavaScript, adelgazar el bundle no alcanza.

## Alternativas

1. **Migrar a Next.js o Remix** para tener renderizado en servidor: implica reescribir el enrutamiento y el despliegue. ADR-0001 ya lo descartó por costo y riesgo.
2. **Prerenderizar con un navegador sin interfaz** (Playwright) durante el build: es sencillo, pero el build de Vercel no tiene Chromium y el resultado depende de la red.
3. **SSG con las herramientas que el proyecto ya usa:**
   - `vite build --ssr` compila las mismas rutas para Node;
   - `react-dom/server` y el router estático de React Router 7 las renderizan a HTML;
   - en el navegador, React **hidrata** ese HTML.

## Decisión

Se adopta la alternativa 3:

- `src/rutas.tsx` define las rutas una sola vez; las usan el navegador (`createBrowserRouter`) y el prerenderizado (`createStaticHandler`).
- `src/prerender.tsx` renderiza `/iniciar-sesion`, `/registrarse`, `/buscar` y `/directorio-eps` en su **estado inicial**: sesión y datos "cargando". Ese es exactamente el primer render del cliente, así que la hidratación coincide sin datos de usuario ni llamadas de red durante el build.
- `scripts/prerender.mjs` inserta ese HTML en la plantilla del build y escribe `dist/<ruta>.html`.
  - `dist/index.html` queda como shell de la SPA para `/` y para las rutas privadas.
  - Vercel sirve los archivos con `cleanUrls`.
  - El servidor de CI (`serve`) los sirve con las reescrituras de `serve.json`. El script falla si falta alguna.
- `src/main.tsx` hace esto:
  - si `#app` trae HTML, espera a que cargue la ruta inicial y usa `hydrateRoot`;
  - si la URL tiene parámetros (el contenido difiere del prerenderizado), React reemplaza el HTML;
  - en el shell vacío monta de inmediato.
- Se quitan las animaciones de entrada (`animate-fade-in`, que parte de opacidad 0) de esas cuatro vistas. Retrasaban el pintado del texto más de un fotograma, y para un adulto mayor el contenido inmediato es preferible a una transición decorativa.
- Se agregan fuentes de respaldo con métricas ajustadas (`size-adjust`, `ascent-override`). Al pintarse el HTML antes que las fuentes web, el cambio de fuente desplazaba el formulario (CLS 0,024 a 0,037).
- **Inicio (`/`) queda fuera** mientras conserve animaciones de framer-motion que parten de opacidad 0. Se incorporará cuando se rediseñe el hero (video accesible, H-16/H-18).

## Evidencia

Experimento A/B en la misma sesión, Lighthouse 12.8.2, 3 corridas y mediana (`TESIS CITASYA/evidencia/09-experimento-prerenderizado`). LCP móvil en segundos:

| Página | Control (main) | SSG |
|---|---|---|
| `/iniciar-sesion` | 2,60 | 2,04 |
| `/registrarse` | 2,60 | 2,22 |
| `/directorio-eps` | 2,45–2,60 | 2,10 |
| `/buscar` | 2,60–3,01 | 2,22 |

- El rendimiento móvil pasa de 92–96 a 96–97; escritorio se mantiene en 100.
- En la traza sin limitar, el LCP observado de `/buscar` bajó a 155 ms: el texto se pinta sin esperar al JavaScript.

## Consecuencias

- El LCP móvil deja de depender del tamaño del bundle en las páginas de entrada más visitadas. Así se puede exigir "Lighthouse CI (móvil)" como check obligatorio.
- Las páginas prerenderizadas se pueden leer sin JavaScript, lo que es una mejora de robustez (red móvil inestable, lectores que procesan el HTML).
- La hidratación exige que el primer render sea determinista: no se puede leer `localStorage`, la hora ni la sesión durante el render inicial de estas vistas.
  - Ejemplo: `AccessibilityWidget` lee sus preferencias con una función segura para Node y muestra la guía de lectura solo tras el primer movimiento del puntero.
  - Las pruebas E2E (`e2e/prerenderizado.spec.ts`) verifican que el título se vea sin JavaScript y que React reutilice el nodo prerenderizado sin errores de hidratación.
- El build agrega un paso (unos 2 s).

## Cómo explicarlo en la sustentación

"Una SPA le entrega al navegador una página en blanco y un programa que la dibuja; en un celular con 4G lenta, el adulto mayor espera a que el programa llegue antes de ver algo. Primero intentamos que el programa pesara menos, y el experimento mostró que no bastaba: lo registramos como resultado negativo. La solución JAMstack fue hacer ese dibujo **una vez, durante el build**, y entregar la página ya escrita. React después solo la 'despierta' (hidratación) sin volver a pintarla. Todo con las mismas herramientas del proyecto, sin migrar de framework, y con pruebas automáticas que fallan si el HTML deja de coincidir."
