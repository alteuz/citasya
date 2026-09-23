# ADR-0002 — Calidad verificada por gates automáticos en CI (defensa en profundidad)

- **Estado:** Aceptada
- **Fecha:** 2026-09-22
- **Trazabilidad:** OE-1 · E-04 (demo A del jurado) · P-DoD · H-10 · R-01

## Contexto

La propuesta define una Definición de Terminado (DoD) verificable: build y pruebas en verde, Lighthouse Accesibilidad ≥ 98 y Rendimiento ≥ 85, cero violaciones axe críticas o serias, y ausencia de vulnerabilidades altas o críticas. El MVP no tenía CI, linter ni pruebas (H-10), así que la DoD no se podía verificar.

Ninguna herramienta de accesibilidad automatizada detecta todos los problemas: cada una observa el sistema desde un ángulo distinto.

## Decisión

Implementar la DoD como **jobs de GitHub Actions** que bloquean la integración a `main` (protección de rama), con una estrategia de accesibilidad en **tres capas complementarias**:

| Capa | Herramienta | Qué detecta | Cuándo |
|---|---|---|---|
| 1. Estática | ESLint + `eslint-plugin-jsx-a11y` (strict) | Errores en el JSX fuente: etiquetas sin control asociado, roles inválidos, atributos ARIA incorrectos | Al escribir código y en el job `calidad` |
| 1b. Componente | Vitest + Testing Library + axe-core (jsdom) | Violaciones WCAG en componentes aislados y en sus estados (error, carga) | Job `calidad` |
| 2. Navegador | Playwright + `@axe-core/playwright` | Violaciones WCAG 2.1 A/AA con estilos y DOM reales (p. ej., contraste), en móvil y escritorio | Job `accesibilidad` |
| 3. Auditoría integral | Lighthouse CI (mediana de 3 corridas) | Puntajes de rendimiento y accesibilidad, LCP, por perfil de dispositivo | Job `lighthouse` (matriz móvil/escritorio) |

A estas se suman `npm audit` (job `seguridad`, OWASP A06) y Dependabot.

**Alcance del gate de seguridad.** El paso bloqueante audita las **dependencias de producción** (`npm audit --omit=dev`), que son el código que se entrega al navegador del paciente. Un segundo paso audita el árbol completo, incluidas las herramientas de desarrollo, y solo informa. Razón: tras `npm audit fix`, las vulnerabilidades altas restantes vienen de la cadena interna de Lighthouse CI (puppeteer, `tmp`, `extract-zip`), sin corrección publicada, y solo se ejecutan dentro del runner efímero del CI. Un gate imposible de cumplir por un componente ajeno al producto no mide la calidad del producto. Las herramientas de desarrollo siguen vigiladas por Dependabot y por el paso informativo.

**Independencia de los gates.** El build es un job propio del que dependen `accesibilidad` y `lighthouse`. Los pasos de `calidad` se ejecutan todos aunque uno falle. Así, un error de lint no impide medir la accesibilidad ni el rendimiento, y cada ejecución es una medición completa. Se corrigió después de que la primera ejecución omitiera axe y Lighthouse porque dependían de un job que falló en el lint.

**Umbrales** (propuesta R-01, pendiente de aval del director): accesibilidad ≥ 98 en ambos perfiles; rendimiento ≥ 85 en móvil y ≥ 95 en escritorio; LCP ≤ 2,5 s; 0 violaciones axe WCAG A/AA críticas o serias. Viven en un solo lugar (`lighthouserc.cjs` y `e2e/accesibilidad.spec.ts`).

**Metodología de medición:** se audita el **build de producción** (`dist/`), no el servidor de desarrollo. Se sirve con `serve`, que aplica compresión gzip y *fallback* SPA, para emular la CDN de Vercel. Se descartó `vite preview` porque no comprime: en una prueba de validación, `/directorio-eps` dio LCP de 10,2 s con `vite preview` contra 3,4 s en producción, ya que el JS pasaba de 209 KB a 751 KB. Lighthouse ejecuta 3 corridas por URL y evalúa la **mediana**, para reducir el ruido de la medición de rendimiento.

## Consecuencias

- **Positivas:** la calidad pasa de ser una revisión manual al final a un requisito verificable en cada cambio, con evidencia histórica (ejecuciones de Actions y artefactos descargables).
- **Negativas:** el CI tarda más (unos 6–8 min por PR). Las cifras de Lighthouse en los runners de GitHub pueden diferir de las locales; por eso la fuente oficial de la tesis es el CI.
- **Limitación reconocida:** las herramientas automáticas detectan solo una fracción de los problemas de accesibilidad (Deque, 2021, reporta cerca del 57 % del volumen de incidencias; otras estimaciones son menores). La validación con usuarios reales (OE-2) no es reemplazable.

## Cómo explicarlo en la sustentación

> "Convertí la Definición de Terminado en código. Cada pull request pasa por cuatro jobs. Si alguno falla, GitHub no deja integrar el cambio a main. Para accesibilidad usé tres capas porque cada herramienta ve cosas distintas: el linter revisa el código fuente, axe revisa la página ya renderizada en un navegador real (por ejemplo el contraste, que el linter no puede ver) y Lighthouse da la visión integral con rendimiento. Aun así, las herramientas automáticas solo detectan una parte de los problemas; por eso el Sprint 2 valida con adultos mayores reales."
