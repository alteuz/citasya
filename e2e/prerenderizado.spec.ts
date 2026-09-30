import { expect, test } from '@playwright/test';

/**
 * Prerenderizado estático (SSG) de las rutas públicas — ADR-0006.
 *
 * 1. El HTML servido ya trae el contenido: el título es visible aunque el
 *    JavaScript esté deshabilitado (el LCP no depende del bundle).
 * 2. React hidrata ese HTML sin reemplazarlo y sin errores en consola: si el
 *    primer render del cliente difiriera del prerenderizado, React descartaría
 *    los nodos (parpadeo) y registraría un error de hidratación.
 */
const RUTAS = [
  { ruta: '/iniciar-sesion', titulo: 'Iniciar sesión' },
  { ruta: '/registrarse', titulo: 'Crear cuenta' },
  { ruta: '/buscar', titulo: '¿Qué médico necesitas hoy?' },
  { ruta: '/directorio-eps', titulo: 'EPS habilitadas en Bogotá' },
];

for (const { ruta, titulo } of RUTAS) {
  test(`${ruta} muestra su contenido sin JavaScript`, async ({ browser }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false });
    const page = await contexto.newPage();
    await page.goto(ruta);
    await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
    await contexto.close();
  });

  test(`${ruta} se hidrata sin reemplazar el HTML ni registrar errores`, async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => {
      // Las solicitudes de datos a Supabase no forman parte de este criterio.
      if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errores.push(m.text());
    });
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const titulo = document.querySelector('h1');
        if (titulo) titulo.dataset.prerenderizado = 'si';
      });
    });

    await page.goto(ruta);
    // React marca el contenedor al montar o hidratar la raíz.
    await page.waitForFunction(() => {
      const raiz = document.getElementById('app');
      return !!raiz && Object.keys(raiz).some((k) => k.startsWith('__reactContainer'));
    });

    // El mismo nodo del prerenderizado sigue en el documento.
    await expect(page.locator('h1[data-prerenderizado="si"]')).toHaveText(titulo);
    expect(errores).toEqual([]);
  });
}
