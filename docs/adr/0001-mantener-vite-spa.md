# ADR-0001 — Mantener Vite + React (SPA) en lugar de migrar a Next.js

- **Estado:** Aceptada
- **Fecha:** 2026-09-22
- **Trazabilidad:** OE-1, OE-3 · desviación respecto a la propuesta aprobada (sección "Arquitectura de la Solución")

## Contexto

La propuesta de grado declaró Next.js 14 / React 18 como capa de presentación. Al auditar el MVP desplegado se constató que fue construido con **Vite 8 + React 19 + React Router 7** como aplicación de página única (SPA), servida estáticamente por la CDN de Vercel y con Supabase como backend (BaaS).

El comité evaluador valoró como aporte la **arquitectura JAMstack y PWA** (solución liviana, instalable, resiliente y con LCP ≤ 2,5 s), no el framework específico.

## Alternativas consideradas

| Criterio | A. Mantener Vite SPA | B. Migrar a Next.js (App Router) |
|---|---|---|
| Cumple JAMstack (frontend estático + APIs + CDN) | Sí | Sí |
| Cumple PWA (manifest + service worker) | Sí | Sí (con configuración adicional) |
| Esfuerzo | Ninguno | 2–3 semanas: reescritura del enrutamiento, del manejo de sesión y de la carga de datos |
| Riesgo sobre el cronograma de 14 semanas | Nulo | Alto; compite con OE-2 y OE-3, declarados no negociables |
| Beneficio principal de Next.js (SSR/SSG) | — | Bajo: casi todas las vistas dependen de la sesión del paciente y de datos en tiempo real; el SEO no es un objetivo del proyecto |
| Aporte a los tres ejes de valor (FHIR, accesibilidad como gate, PWA) | Neutro | Neutro |

## Decisión

Se mantiene **Vite + React SPA**. El problema de rendimiento medido (LCP móvil de 10–11 s, hallazgo H-02) se origina en el **retraso de renderizado** causado por animaciones de entrada, no en la ausencia de renderizado en servidor. Se corrige en la capa de presentación y se verifica con Lighthouse CI.

Si una vista pública necesitara HTML prerenderizado (por ejemplo, la página de inicio), se evaluará un prerender estático en build antes que una migración de framework.

## Consecuencias

- **Positivas:** el esfuerzo se concentra en los objetivos del trabajo de grado; se conserva el historial del MVP y la comparabilidad de las métricas antes/después.
- **Negativas:** el documento final debe reportar esta desviación respecto a la propuesta, con esta justificación.
- **Seguimiento:** si Lighthouse CI no alcanza los umbrales de la hipótesis después de las optimizaciones de presentación, esta decisión se reabre.

## Cómo explicarlo en la sustentación

> "La propuesta mencionaba Next.js, pero lo que el comité valoró fue la arquitectura JAMstack y PWA, y eso Vite ya lo cumple: un frontend estático servido por CDN que consume Supabase. Medí antes de decidir, y el LCP de 11 segundos no venía de la falta de renderizado en servidor sino de animaciones que ocultaban el contenido. Migrar habría costado tres semanas sin aportar a ninguno de los tres ejes de valor, así que documenté la decisión y ataqué la causa real."
