# ADR-0007 — Portada prerenderizada con póster LCP, video diferido y animaciones CSS

- **Estado:** Aceptada
- **Fecha:** 2026-10-15
- **Trazabilidad:** H-02 (LCP móvil de la portada > 2,5 s) · H-16/H-18 (hero accesible) · IND-05 · OE-1 · completa ADR-0006

## Contexto

Tras ADR-0006, cuatro de las cinco páginas públicas cumplían el LCP móvil (1,58 s en producción). La portada (`/`) seguía fuera del prerenderizado y era el único indicador técnico en rojo: 2,94 s en CI (umbral 2,5 s). Por eso el check «Lighthouse CI (móvil)» no podía ser obligatorio.

El diagnóstico con Lighthouse (perfil móvil) mostró:

- **El elemento LCP era el video de fondo**: un MP4 de 16,7 MB (960×960, 7 Mb/s, con pista de audio aunque se reproduce silenciado).
- **El 87 % del LCP era retraso de renderizado**: el `<video>` no existía hasta que el JavaScript dibujaba la página, y además arrancaba invisible (opacidad 0) hasta tener datos.
- La página cargaba framer-motion (≈ 45 KB) antes de poder pintarse.
- El video se movía de forma indefinida sin un control para detenerlo, lo que exige WCAG 2.2.2 (Pausar, detener, ocultar) cuando el movimiento dura más de 5 s. Solo existía la opción «reducir movimiento» del widget.

## Alternativas

1. **Quitar el video** de la portada. Resuelve el rendimiento, pero el usuario pidió conservarlo por identidad visual (decisión del 26-sep-2026: «mantenerlo, pero accesible»).
2. **Imagen estática solo en móvil** y video en escritorio. Deja una experiencia distinta por dispositivo y no resuelve la dependencia del JavaScript.
3. **Prerenderizar la portada y separar «lo que se ve primero» de «lo que se mueve»** (elegida).

## Decisión

- **Póster como elemento LCP.**
  - El primer cuadro del video (el logo de frente) se exporta como WebP de 15,6 KB (`public/portada-poster.webp`).
  - El HTML prerenderizado lo trae como `poster` del `<video>` y lo precarga con `fetchpriority="high"`.
- **Video diferido y más liviano.**
  - Se recodifica a 720×720 en H.264 (CRF 27, sin audio, `faststart`): 1,24 MB, −92,6 %, con SSIM de 0,990 frente al original.
  - Se pide solo cuando la página terminó de cargar y el navegador está libre (`requestIdleCallback`).
  - Con «ahorro de datos» no se descarga.
- **Pausa visible (WCAG 2.2.2).** Un botón «Pausar/Reanudar» (`aria-pressed`) controla el video. Con movimiento reducido el video no se reproduce y el botón se oculta.
- **Animaciones sin librerías.** Se elimina framer-motion del proyecto.
  - **Entrada:** animaciones CSS que corren aunque el JavaScript no haya cargado.
  - **Efectos del desplazamiento:** el video se aleja, la portada sube y la barra gana fondo, con líneas de tiempo de scroll en CSS (`animation-timeline: scroll()`), que corren en el compositor. Donde no hay soporte, la portada queda estática.
  - **Menú móvil:** transiciones CSS. Además ahora es un diálogo con `inert`, Escape y devolución del foco.
  - **Revelado de secciones:** `IntersectionObserver` con transiciones CSS, como mejora progresiva (el HTML llega visible).
  - **Contador de cifras:** `requestAnimationFrame` con respaldo por tiempo.
  - Todo se anula con `prefers-reduced-motion` y con la opción del widget.
- **Shell de la SPA separado.**
  - `dist/index.html` pasa a ser la portada prerenderizada.
  - La plantilla vacía se guarda como `dist/spa.html`: el fallback de Vercel apunta a `/spa` y el de `serve` a `/spa.html`.
  - Así una ruta privada nunca recibe el HTML de otra página.
  - `scripts/prerender.mjs` falla si alguna de estas reglas falta.
  - El Service Worker usa `/spa` como respaldo sin conexión.
- **Titular accesible.** Las palabras «Agenda», «Sin» y «Filas.» llevan espacios reales entre sí, para que el lector de pantalla no las lea como una sola palabra.

## Evidencia

Toda la evidencia está en `TESIS CITASYA/evidencia/11-portada-ssg-2026-10-15`.

- **Peso del JavaScript de la portada:** 52 KB + 48 KB (framer-motion) → 18,9 KB (5,9 KB comprimido).
- **Peso del video:** de 16,7 MB a 1,24 MB, más un póster de 15,6 KB.
- **Pruebas E2E:** 32 de 32. Se agregaron la portada sin JavaScript y su hidratación sin errores, en móvil y en escritorio.
- **Experimento de pintado:** CPU limitada 4× y 5 corridas por variante. Las animaciones de entrada no retrasan el primer pintado: medianas de 308 a 388 ms en todas las variantes.
- **Lighthouse móvil:** en este equipo Windows la simulación Lantern sobrestima el LCP aun para páginas que en CI y producción cumplen (por ejemplo, `/buscar`). La medición oficial es la de CI y la de producción.

## Consecuencias

- La portada ya no depende del JavaScript para pintarse y se puede leer sin él. Con esto todas las rutas públicas quedan prerenderizadas.
- Cuando CI confirme el LCP móvil de la portada, «Lighthouse CI (móvil)» pasa a ser un check obligatorio de la protección de rama (ADR-0003: medir → corregir → bloquear).
- Una dependencia menos (framer-motion) y menos JavaScript en el hilo principal en todas las rutas.
- **Costo:** las líneas de tiempo de scroll en CSS aún no existen en todos los navegadores (Firefox sin soporte estable). Allí el efecto de desplazamiento no aparece, pero nada se rompe.

## Cómo explicarlo en la sustentación

«El diagnóstico mostró que la portada tardaba porque lo más grande de la pantalla era un video de casi 17 MB que, además, esperaba al JavaScript para existir. Separamos lo que se ve primero de lo que se mueve. Lo primero es una foto de 15 KB del primer cuadro, que viene escrita en el HTML. Lo segundo es el mismo video, recomprimido a 1,2 MB sin perder calidad medible, que llega cuando la página ya está lista. Y como el video se mueve sin parar, agregamos un botón de pausa: no es un detalle estético, es el criterio 2.2.2 de WCAG. De paso reemplazamos la librería de animaciones por CSS, que el navegador ejecuta fuera del hilo principal.»
