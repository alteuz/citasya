# ADR-0010 — Renovación visual «noche clínica»

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Trazabilidad:** OE-1 · IND-05 (rendimiento) · H-16/H-18 (portada accesible) · completa ADR-0007

## Contexto

La interfaz usaba grafito neutro, titulares en DM Serif Display y una portada negra con el video del logo. El autor pidió renovar por completo la estética sin cambiar ninguna funcionalidad. Para eso entregó un tablero de marca con:

- el logo (calendario + estetoscopio) en placa de vidrio luminosa;
- la paleta: azul marino `#0B388F`, azul `#1D69FC`, cian `#00E9FC`, violeta `#5843FC` y hielo `#DAE6FE`;
- botones en píldora con degradado y con borde cian;
- placas de íconos;
- tres tarjetas de valores: «Agenda fácil», «Seguro y confiable» y «Para todos»;
- una ilustración 3D de un calendario con estetoscopio.

Como referencia de composición pidió una portada de producto: texto a la izquierda, la pieza central en video, tarjetas de vidrio con cifras a la derecha y una entrada escalonada.

Restricciones que no podían retroceder:

- cero violaciones de axe;
- los umbrales de Lighthouse CI (LCP ≤ 2,5 s en móvil, rendimiento ≥ 0,85 en móvil y ≥ 0,95 en escritorio, accesibilidad ≥ 0,98);
- el prerenderizado y la hidratación sin diferencias;
- el alto contraste y el «reducir movimiento» del widget;
- los textos que verifican las pruebas.

## Decisión

### Sistema de diseño

**Tokens.** Las superficies pasan a una escala `navy`: el fondo es `#030A1F` y las tarjetas `#0A1738`. Se agrega la escala `violet`. Los componentes siguen usando solo los tokens semánticos (`surface-*`, `text-*`, `line-*`, `brand`, `accent` y los estados). Por eso el cambio de paleta llega a todas las pantallas sin tocar su lógica.

**Tipografía.** Una sola familia variable, Plus Jakarta Sans (200–800, licencia OFL-1.1), alojada en el mismo dominio. Reemplaza a DM Sans y DM Serif Display y pesa 27 KB, frente a 84 KB de las tres fuentes anteriores. Tiene fuentes de respaldo con métricas ajustadas, medidas en Chromium:

- regular: `size-adjust` 104,7 %;
- negrita: `size-adjust` 100,8 %.

**Piezas de la identidad**, en la capa `components` para que las utilidades puedan ajustarlas y el alto contraste siempre gane:

- `vidrio` y `tarjeta` (paneles);
- `borde-luz` (borde en degradado con máscara);
- `boton-primario`: degradado violeta → azul, con el cian solo en el último 20 %, donde va la flecha;
- `boton-contorno` (borde cian);
- `texto-degradado`;
- `placa-logo`;
- `linea-luz`;
- `banda-cabecera` (cabecera de las pantallas internas);
- `fondo-app`: auroras y retícula en seudoelementos fijos.

**Componentes:**

- `Logo`: símbolo en placa más nombre, que reemplaza el marcado duplicado en cinco archivos;
- `Ondas` (pie de página);
- `PanelMarca` (pantallas de acceso);
- `FotoDiferida`.

### Portada

La composición es de tres zonas: texto | escena del logo | cifras reales (9 EPS, 32 sedes y 12 especialidades) en tarjetas de vidrio.

**Escena del logo.** El video tiene fondo negro y se mezcla en modo `screen` sobre una capa opaca azul marino, así el negro desaparece y solo queda la luz del logo. La mezcla ocurre en dos niveles: el video sobre el aro y el halo dentro de la escena, y la escena sobre la portada. Un aro de vidrio cónico y un halo completan la escena.

**Entrada en CSS**, que también corre sin JavaScript:

- la barra cae escalonada;
- el punto de «Disponible 24/7» se enciende con un recorte circular;
- cada palabra del titular sube en su máscara;
- las tarjetas suben una tras otra.

**Se conserva** todo lo de ADR-0007: póster como LCP, video con la primera interacción, botón de pausa, líneas de tiempo de scroll (ahora solo en escritorio) y menú-diálogo.

**Secciones nuevas.** Hay dos, con contenido verificable:

- los tres valores de la marca;
- «Para todos», con las opciones reales del widget de accesibilidad.

### Fotos

Se usan dos fotos de Unsplash (licencia Unsplash) con un duotono azul marino de la marca. Solo se piden cuando su sección se acerca a la pantalla (`FotoDiferida`).

### Pantallas internas

- Las cabeceras pasan a `banda-cabecera` y las tarjetas a `tarjeta`.
- Las selecciones de fecha y hora brillan en cian o llevan el degradado de la marca.
- Las pantallas de acceso se dividen en el formulario y un panel de marca solo de escritorio con la ilustración 3D. El panel va después del formulario en el DOM.

## Alternativas descartadas

1. **Tema claro o doble tema.**
   - Duplicaba la verificación de contraste.
   - El tablero de marca es oscuro.
   - El alto contraste del widget ya ofrece blanco y negro puros.
2. **Desenfoque animado y auroras en movimiento también en el celular.** Se descartó porque costaba pintura y empujaba el LCP. En pantallas menores de 64 rem el vidrio es más opaco y no lleva `backdrop-filter`, las auroras quedan quietas y la escena del logo no se anima.
3. **Precargar la fuente en el `<head>`.**
   - Adelanta el FCP: de 2,06 a 1,83 s en la portada.
   - Pero en la simulación de Lighthouse sube el LCP de la portada: de 2,23 a 2,45 s.
   - Se prefirió el LCP, que es el umbral de la hipótesis.

## Evidencia

Toda la evidencia está en `TESIS CITASYA/evidencia/15-renovacion-visual-2026-11-03`.

**Mediciones** (Lighthouse 12.8.2, misma máquina, el mismo build de producción servido con `serve`, mediana de 3 corridas):

| Móvil (LCP / rendimiento) | Antes (main `abdfdf4`) | Después |
|---|---|---|
| `/` | 2,26 s / 96 | 2,23 s / 97 |
| `/iniciar-sesion` | 2,03 s / 98 | 2,15 s / 97 |
| `/registrarse` | 2,22 s / 96 | 2,15 s / 97 |
| `/directorio-eps` | 2,03 s / 98 | 2,14 s / 97 |
| `/buscar` | 2,38 s / 96 | 2,15 s / 97 |

- **Escritorio:** 100 de rendimiento y de accesibilidad en las cinco páginas, antes y después. LCP de 0,49 a 0,52 s.
- **axe-core 4.11.4:** 0 violaciones de cualquier tipo en las 7 vistas de la auditoría (públicas, resultados y reserva).
- **E2E:** 32 de 32.
- **Pruebas unitarias:** 102 de 102.

Los cambios que llevaron la portada móvil de 3,21 a 2,23 s fueron:

1. Ubicar las auroras desde arriba y en rem. Un `top` en %, al cambiar la altura con la fuente web, contaba como desplazamiento de diseño: CLS de 0,258 a 0,015.
2. Quitar la opacidad de la entrada de la escena.
3. Diferir las fotos.
4. Agrupar los íconos de lucide en un solo archivo. Antes la portada pedía ocho archivos de pocos bytes antes del primer pintado.
5. Cuantizar los PNG de los íconos de la app: `icon-512` pasó de 170 a 65 KB.

### Contraste de los tokens (WCAG 2.2)

| Par | Contraste mínimo sobre las superficies |
|---|---|
| `text-primary` `#F2F6FF` | 12,9:1 |
| `text-secondary` `#C1CEEC` | 8,9:1 |
| `text-muted` `#9AADD6` | 6,2:1 |
| `link` `#8DB0FF` | 6,5:1 |
| `accent` `#22E4F7` | 9,0:1 |
| `success` / `warning` / `error` | 7,9 / 9,1 / 6,2:1 |
| `line-input` `#6680C2` (borde de control) | 3,6:1 |
| Blanco sobre `#1D69FC` (zona del texto del botón principal) | 4,7:1 (los tonos violetas del degradado: 5,4–5,7:1) |
| Blanco sobre `error-strong` `#DC2626` | 4,8:1 |

### Créditos de los recursos

| Recurso | Origen | Licencia |
|---|---|---|
| `public/imagenes/consulta-*.webp` | Foto de Vitaly Gariev en Unsplash (`unsplash.com/photos/Ey-IxmbZ5TQ`), recortada y en duotono | Licencia Unsplash (uso libre, sin atribución obligatoria) |
| `public/imagenes/para-todos-*.webp` | Foto de Vitaly Gariev en Unsplash (`unsplash.com/photos/cHbyGVOQspk`), recortada y en duotono | Licencia Unsplash |
| `public/imagenes/calendario-3d-*.webp` | Ilustración del tablero de marca entregado por el autor | Propia del proyecto |
| `public/marca/logo-marca*.webp`, `favicon-*.png`, `icons/*.png` | Logo del proyecto (`app-logo-transparent.png`), recortado y compuesto en su placa | Propia del proyecto |
| Plus Jakarta Sans | `@fontsource-variable/plus-jakarta-sans` | SIL OFL 1.1 |
| Íconos | `lucide-react` | ISC |

## Consecuencias

- La identidad visual coincide con el tablero de marca en todas las pantallas. Solo cambiaron clases, estilos y recursos: rutas, manejadores, validaciones, textos verificados por las pruebas y llamadas a la API quedan iguales.
- Las capturas del documento de grado anteriores al 3-nov-2026 muestran el diseño anterior.
- Una dependencia de fuentes menos: se reemplazan dos paquetes por uno.
- Las fotos sin JavaScript quedan como recuadro vacío. Son un complemento del texto, que sigue completo.

## Cómo explicarlo en la sustentación

«Renovamos la identidad sin tocar la lógica: todo el color pasa por tokens semánticos, así que cambiar la paleta cambió todas las pantallas a la vez. Lo nuevo se midió contra lo anterior en la misma máquina: el LCP móvil queda en el mismo rango que antes, y la portada en 2,23 s frente a 2,26 s, con cero violaciones de accesibilidad. Para lograrlo hubo que encontrar un desplazamiento de diseño causado por una aurora decorativa y evitar que las fotos y los íconos compitieran con el póster durante la carga.»
