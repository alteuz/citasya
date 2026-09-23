# ADR-0003 — Adopción progresiva de los gates: medir → corregir → bloquear

- **Estado:** Aceptada
- **Fecha:** 2026-09-22
- **Trazabilidad:** OE-1 · E-04 · R-04 (resultados iniciales vs actuales)

## Contexto

La línea base (22-sep-2026) incumple todos los umbrales de la hipótesis: LCP móvil de hasta 11,5 s, 2 violaciones axe serias, 19 errores de lint y 6 vulnerabilidades altas. Si los gates se activan como bloqueantes el mismo día en que se crean, ningún PR podría integrarse, incluidos los que corrigen esos problemas.

## Alternativas

1. **Un solo PR gigante** con pipeline y todas las correcciones: se pierde la evidencia del estado "rojo" inicial y la revisión se vuelve inmanejable.
2. **Bajar temporalmente los umbrales** hasta el nivel actual: oculta la deuda técnica y debilita la hipótesis.
3. **Adopción en tres fases** con los umbrales definitivos desde el primer día.

## Decisión

Se adopta la alternativa 3:

1. **Medir.** El PR del pipeline se integra con los umbrales definitivos. `main` queda en rojo, y ese rojo es la medición oficial del estado inicial (evidencia R-04).
2. **Corregir.** Cada hallazgo (H-xx) se corrige en un PR pequeño y enfocado. Cada ejecución del CI registra el avance: número de violaciones, puntajes, LCP.
3. **Bloquear.** Cuando `main` queda en verde, se activa la protección de rama exigiendo todos los jobs. Desde ese momento ningún cambio que degrade la calidad puede integrarse.

## Consecuencias

- El historial de GitHub Actions muestra de forma verificable la transición rojo → verde, una evidencia directa para la demo A del jurado.
- Durante la fase 2, `main` reporta fallas conocidas y documentadas. Ningún despliegue se hace desde un `main` en rojo.
- Para la sustentación se prepara un PR de demostración que introduce una regresión deliberada (por ejemplo, bajar el contraste de un botón) y muestra el bloqueo.

## Cómo explicarlo en la sustentación

> "No bajé los umbrales para que el pipeline pasara. Lo instalé con las metas reales y dejé que marcara rojo, porque ese rojo era la medición honesta del punto de partida. Luego cada corrección fue un PR pequeño que se ve avanzar en el historial del CI. Cuando todo quedó en verde activé la protección de rama, y desde entonces el sistema impide retroceder."
