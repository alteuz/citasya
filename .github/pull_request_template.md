## Contexto

<!-- ¿Qué problema resuelve? Referencia el ID de la matriz de trazabilidad (H-xx, R-xx, E-xx, OE-x). -->

## Cambios

-

## Evidencia (antes → después)

<!-- Métricas, capturas o enlaces a los artefactos del CI (Lighthouse, axe, cobertura). -->

## Definición de Terminado

Los gates automáticos del CI verifican los puntos marcados con ⚙️; el resto es revisión del autor.

- [ ] ⚙️ Tipos, lint (incluye jsx-a11y) y pruebas unitarias en verde
- [ ] ⚙️ `npm audit` sin vulnerabilidades altas o críticas
- [ ] ⚙️ axe-core: 0 violaciones WCAG 2.1 A/AA críticas o serias (móvil y escritorio)
- [ ] ⚙️ Lighthouse CI dentro de los umbrales de la hipótesis (móvil y escritorio)
- [ ] Pruebas nuevas o actualizadas para el comportamiento modificado
- [ ] Decisiones de arquitectura registradas en `docs/adr/` si aplica
- [ ] Sin secretos ni datos personales en el diff
