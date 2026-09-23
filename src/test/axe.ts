import axe, { type Result } from 'axe-core';

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Ejecuta axe-core (WCAG 2.1 A/AA) sobre un nodo renderizado en jsdom.
 *
 * `color-contrast` se desactiva porque jsdom no calcula estilos ni layout;
 * el contraste se verifica en navegador real (Playwright + axe y Lighthouse CI).
 */
export async function findA11yViolations(container: Element): Promise<Result[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: WCAG_21_AA },
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations;
}

/** Mensaje legible para el assert: id de la regla y selector afectado. */
export function describeViolations(violations: Result[]): string {
  return violations
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
    .join('\n');
}
