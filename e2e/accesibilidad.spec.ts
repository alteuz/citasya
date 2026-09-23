import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Gate de accesibilidad (capa 2): axe-core en navegador real.
 *
 * Criterio de la hipótesis: cero violaciones WCAG 2.1 A/AA de impacto
 * crítico o serio. Las demás violaciones (moderadas, menores o de buenas
 * prácticas de axe) no bloquean, pero quedan anotadas en el reporte como
 * deuda visible.
 */
const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const BLOCKING_IMPACTS = new Set(['critical', 'serious']);

const PUBLIC_PAGES = [
  { name: 'Inicio', path: '/' },
  { name: 'Iniciar sesión', path: '/iniciar-sesion' },
  { name: 'Registro', path: '/registrarse' },
  { name: 'Directorio EPS', path: '/directorio-eps' },
  { name: 'Búsqueda (filtros)', path: '/buscar' },
];

/** Espera a que terminen las animaciones finitas de entrada (framer-motion, CSS). */
async function waitForEntryAnimations(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .every((a) => a.playState !== 'running'),
  );
}

async function auditPage(page: Page, name: string): Promise<void> {
  await waitForEntryAnimations(page);
  const { violations } = await new AxeBuilder({ page }).analyze();

  await test.info().attach(`axe-${name}.json`, {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  });

  const isBlocking = (v: (typeof violations)[number]) =>
    BLOCKING_IMPACTS.has(v.impact ?? '') && v.tags.some((t) => WCAG_21_AA.includes(t));

  for (const v of violations.filter((v) => !isBlocking(v))) {
    test.info().annotations.push({
      type: 'deuda-a11y',
      description: `${name}: ${v.id} (${v.impact}, ${v.nodes.length} nodos)`,
    });
  }

  const blocking = violations.filter(isBlocking);
  const detail = blocking
    .map((v) => `${v.id} [${v.impact}] ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`)
    .join('\n');
  expect(
    blocking.map((v) => v.id),
    `Violaciones WCAG 2.1 A/AA críticas o serias en "${name}":\n${detail}`,
  ).toEqual([]);
}

for (const { name, path } of PUBLIC_PAGES) {
  test(`${name} cumple WCAG 2.1 AA (sin violaciones críticas o serias)`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('#app')).not.toBeEmpty();
    await auditPage(page, name);
  });
}

test('Flujo de búsqueda y reserva cumple WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/buscar');

  const specialty = page.locator('#filter-specialty');
  await expect(specialty.locator('option:not([value=""])').first()).toBeAttached();
  await specialty.selectOption({ index: 1 });
  await page.locator('#filter-eps').selectOption({ index: 1 });
  await page.getByRole('button', { name: /encontrar médicos/i }).click();

  const availability = page.getByRole('button', { name: /ver disponibilidad/i }).first();
  await expect(availability).toBeVisible();
  await auditPage(page, 'Búsqueda (resultados)');

  await availability.click();
  await expect(page.getByRole('heading', { name: /selecciona una fecha/i })).toBeVisible();
  await auditPage(page, 'Reserva de cita');
});
