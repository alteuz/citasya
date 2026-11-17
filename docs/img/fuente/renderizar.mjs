// Renderiza los gráficos del README a partir de graficos.html:
// docs/img/banner.png, resultados.png, lcp.png y capturas.png. Uso: node docs/img/fuente/renderizar.mjs
// Después se convierten a WebP (calidad 88, con transparencia) para que pesen poco sin bandas en los
// degradados, por ejemplo con `cwebp -q 88 banner.png -o banner.webp`, y se borran los PNG.
import { chromium } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ deviceScaleFactor: 1.5, viewport: { width: 1320, height: 900 } });
await pagina.goto(pathToFileURL(path.join(aqui, 'graficos.html')).href);
await pagina.evaluate(() => document.fonts.ready);
await pagina.waitForLoadState('networkidle');
for (const [id, archivo] of [['banner', 'banner.png'], ['metricas', 'resultados.png'], ['lcp', 'lcp.png'], ['capturas', 'capturas.png']]) {
  await pagina.locator(`#${id}`).screenshot({ path: path.join(aqui, '..', archivo), omitBackground: true });
  console.log('generado docs/img/' + archivo);
}
await navegador.close();
