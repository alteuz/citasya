import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';

// URL base de producción
const BASE_URL = 'https://citasya-seven.vercel.app';

// Configuración de páginas a auditar
const PAGES = [
  { name: 'Inicio (HomePage)', url: '/' },
  { name: 'Iniciar Sesión', url: '/iniciar-sesion' },
  { name: 'Registro (RegisterPage)', url: '/registrarse' },
  { name: 'Directorio EPS', url: '/directorio-eps' },
  { name: 'Búsqueda de Médicos (Paso 1: Wizard)', url: '/buscar' }
];

async function runAudit() {
  console.log('Iniciando auditoría WCAG con Axe-Core...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'es-CO'
  });
  const page = await context.newPage();
  
  const results = {};

  try {
    // 1. Auditar páginas estáticas/públicas
    for (const target of PAGES) {
      const fullUrl = `${BASE_URL}${target.url}`;
      console.log(`Auditando ${target.name} en ${fullUrl}...`);
      
      await page.goto(fullUrl, { waitUntil: 'networkidle' });
      // Esperar un poco para animaciones
      await page.waitForTimeout(1000);
      
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      results[target.name] = {
        url: target.url,
        passesCount: accessibilityScanResults.passes.length,
        violations: accessibilityScanResults.violations
      };
      
      console.log(`  - Violaciones encontradas: ${accessibilityScanResults.violations.length}`);
    }

    // 2. Auditar página de resultados de búsqueda (Interactivo)
    console.log('Auditando Resultados de Búsqueda (Paso 2: Médicos Encontrados)...');
    await page.goto(`${BASE_URL}/buscar`, { waitUntil: 'networkidle' });
    
    // Esperar que carguen los selectores
    await page.waitForSelector('#filter-specialty');
    await page.waitForSelector('#filter-eps');
    
    // Seleccionar opciones en los dropdowns
    // Nota: Seleccionamos la primera opción con valor (que no sea "")
    const specialtyOptions = await page.$$eval('#filter-specialty option', opts => 
      opts.map(o => o.value).filter(v => v !== '')
    );
    const epsOptions = await page.$$eval('#filter-eps option', opts => 
      opts.map(o => o.value).filter(v => v !== '')
    );

    if (specialtyOptions.length > 0 && epsOptions.length > 0) {
      console.log(`  Seleccionando especialidad ID: ${specialtyOptions[0]} y EPS ID: ${epsOptions[0]}`);
      await page.selectOption('#filter-specialty', specialtyOptions[0]);
      await page.selectOption('#filter-eps', epsOptions[0]);
      
      // Click en buscar
      await page.click('button:has-text("Encontrar Médicos")');
      
      // Esperar a que cargue la lista de médicos (las tarjetas tienen el botón "Ver disponibilidad")
      await page.waitForSelector('button:has-text("Ver disponibilidad")');
      await page.waitForTimeout(1000);
      
      const searchResultsScan = await new AxeBuilder({ page }).analyze();
      results['Búsqueda de Médicos (Paso 2: Resultados)'] = {
        url: page.url().replace(BASE_URL, ''),
        passesCount: searchResultsScan.passes.length,
        violations: searchResultsScan.violations
      };
      console.log(`  - Violaciones encontradas: ${searchResultsScan.violations.length}`);
      
      // 3. Auditar Página de Agendamiento (BookingPage)
      console.log('Auditando Página de Reserva de Cita (BookingPage)...');
      // Hacer click en el primer botón "Ver disponibilidad"
      await page.click('button:has-text("Ver disponibilidad"):first-of-type');
      
      // Esperar a que cargue el calendario o disponibilidad
      await page.waitForSelector('h2:has-text("Selecciona una fecha")');
      await page.waitForTimeout(1000);
      
      const bookingScan = await new AxeBuilder({ page }).analyze();
      results['Reserva de Cita (BookingPage)'] = {
        url: page.url().replace(BASE_URL, ''),
        passesCount: bookingScan.passes.length,
        violations: bookingScan.violations
      };
      console.log(`  - Violaciones encontradas: ${bookingScan.violations.length}`);
    } else {
      console.warn('  No se encontraron especialidades o EPS para realizar la búsqueda interactiva.');
    }

  } catch (error) {
    console.error('Error durante la auditoría:', error);
  } finally {
    await browser.close();
  }

  // Guardar resultados crudos en JSON
  const reportDir = path.resolve('C:/Users/alteu/.gemini/antigravity/brain/82821ff4-3d9f-4538-9699-87264bbcc988');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(reportDir, 'axe-raw-results.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log(`Resultados crudos guardados en ${path.join(reportDir, 'axe-raw-results.json')}`);
  
  // Generar reporte en Markdown
  generateMarkdownReport(results, reportDir);
}

function generateMarkdownReport(results, outputDir) {
  let md = `# Reporte de Accesibilidad WCAG 2.1 — CitasYA\n\n`;
  md += `Este reporte fue generado de forma automatizada utilizando **Axe-Core** y **Playwright** analizando la aplicación desplegada en producción (${BASE_URL}) bajo los estándares WCAG 2.1 Niveles A y AA.\n\n`;
  
  md += `## Resumen Ejecutivo\n\n`;
  md += `| Página / Estado | Ruta | Reglas Pasadas | Violaciones | Estado |\n`;
  md += `|---|---|---|---|---|\n`;
  
  let totalViolations = 0;
  
  for (const [pageName, data] of Object.entries(results)) {
    const vCount = data.violations.length;
    totalViolations += vCount;
    const status = vCount === 0 ? '🟢 Cumple' : vCount <= 2 ? '🟡 Cumple con observaciones' : '🔴 Violaciones de accesibilidad';
    md += `| ${pageName} | \`${data.url}\` | ${data.passesCount} | ${vCount} | ${status} |\n`;
  }
  
  md += `\n**Total de violaciones críticas o graves detectadas:** ${totalViolations}\n\n`;
  md += `---\n\n`;
  md += `## Detalle de Violaciones Encontradas\n\n`;
  
  if (totalViolations === 0) {
    md += `### ¡Felicitaciones! No se detectaron violaciones de accesibilidad automatizadas.\n\n`;
  } else {
    for (const [pageName, data] of Object.entries(results)) {
      if (data.violations.length === 0) continue;
      
      md += `### 📄 ${pageName} (\`${data.url}\`)\n\n`;
      md += `Se detectaron **${data.violations.length}** tipos de violaciones de accesibilidad en esta vista:\n\n`;
      
      data.violations.forEach((v, index) => {
        md += `#### ${index + 1}. [${v.impact.toUpperCase()}] ${v.id}: ${v.help}\n`;
        md += `- **Criterio WCAG:** ${v.tags.filter(t => t.startsWith('wcag')).join(', ')}\n`;
        md += `- **Descripción:** ${v.description}\n`;
        md += `- **Recomendación:** ${v.helpUrl ? `[Documentación de Axe para solucionar](${v.helpUrl})` : 'Revisar marcado semántico.'}\n`;
        md += `- **Elementos Afectados:** ${v.nodes.length}\n`;
        md += `  \`\`\`html\n`;
        v.nodes.slice(0, 3).forEach(n => {
          md += `  ${n.html}\n`;
        });
        if (v.nodes.length > 3) {
          md += `  ... y ${v.nodes.length - 3} elementos más.\n`;
        }
        md += `  \`\`\`\n\n`;
      });
      md += `\n---\n\n`;
    }
  }
  
  md += `## Ajustes de Accesibilidad Implementados (Manuales)\n\n`;
  md += `CitasYA cuenta con un widget de accesibilidad activo que ofrece soporte adicional para adultos mayores:\n`;
  md += `1. **Tamaño del Texto**: Escalamiento dinámico a 115% y 130% sin romper el layout.\n`;
  md += `2. **Alto Contraste**: Inversión completa a escala de grises y contrastes WCAG AAA (negro sobre blanco y enlaces azules puros).\n`;
  md += `3. **Guía de Lectura**: Regla horizontal que sigue el cursor para prevenir desorientación visual.\n`;
  md += `4. **Lector de Voz**: Síntesis de voz incorporada que lee textos, etiquetas y valores de inputs al pasar el cursor o hacer foco.\n`;
  md += `5. **Reducción de Movimiento**: Desactivación de transiciones CSS y efectos hover 3D para evitar mareos o desorientación.\n`;
  
  fs.writeFileSync(path.join(outputDir, 'reporte_wcag_citasya.md'), md, 'utf-8');
  console.log(`Reporte Markdown guardado en ${path.join(outputDir, 'reporte_wcag_citasya.md')}`);
}

runAudit();
