# ADR-0004 — Deuda del tema de colores: de escala invertida a tokens semánticos

- **Estado:** Aceptada (corrección puntual aplicada; migración completa planificada)
- **Fecha:** 2026-09-22
- **Trazabilidad:** H-06 · H-14 · OE-1 · WCAG 1.4.3 (contraste mínimo)

## Contexto

El análisis de la violación `color-contrast` de la página de inicio (texto blanco sobre turquesa, 2,11:1) reveló una causa de arquitectura, no un color mal elegido.

El tema oscuro de `src/index.css` se implementó **invirtiendo la escala numérica** de la paleta: en modo oscuro, `--color-primary-950`, que por convención es el tono más oscuro, vale `#ffffff`, y `--color-primary-300` pasa a ser un morado oscuro (`#2d2b7a`). A eso se suman más de 30 reglas con `!important` que sobrescriben combinaciones de clases concretas.

Consecuencia: **el contraste real no se puede deducir leyendo el componente.** Un desarrollador que escribe `text-primary-950` sobre un fondo claro espera texto oscuro y obtiene texto blanco. Los tres problemas de contraste de la línea base (botón "Registrarse", aviso de instalación de la PWA) salieron de este mecanismo.

## Decisión

1. **Corrección inmediata (este PR):** en los puntos donde el contraste es crítico se usa un color explícito (`text-[#0d0d1a]` sobre turquesa, `text-white` sobre el morado del aviso), con un comentario que remite a este ADR. Los gates de CI (axe en navegador y Lighthouse) verifican el resultado en los dos perfiles.
2. **Solución de fondo (planificada):** migrar a **tokens semánticos** que expresen intención y no posición en una escala: `--color-fg`, `--color-fg-muted`, `--color-bg`, `--color-surface`, `--color-on-accent`, `--color-border`. Cada tema (claro, oscuro, alto contraste) define los mismos tokens, con pares fondo/texto verificados en ≥ 4,5:1. Se eliminarían las reglas `!important`.
3. **Criterio de aceptación de la migración:** axe y Lighthouse en verde en los tres temas. Para eso se agregará al E2E una ejecución con la clase `high-contrast` activa.

## Alternativas descartadas

- **Seguir corrigiendo con `!important`:** agrava el problema, porque cada corrección es otra excepción invisible.
- **Migrar en este PR:** toca casi todos los componentes (≈ 4.500 líneas) y mezclaría una refactorización visual con correcciones puntuales verificables. Se separa para que cada cambio se pueda revisar.

## Cómo explicarlo en la sustentación

> "Al investigar un error de contraste encontré que el tema oscuro invertía la paleta: la clase que se llama 'el morado más oscuro' pintaba blanco. Eso hace imposible garantizar el contraste leyendo el código. Corregí los casos que fallaban, con los gates del CI como verificación, y dejé documentado el rediseño correcto: tokens con significado, como 'color de texto sobre acento', que cada tema define con pares ya verificados."
