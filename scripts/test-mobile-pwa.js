import { chromium, devices } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://citasya-seven.vercel.app';
const ARTIFACT_DIR = 'C:/Users/alteu/.gemini/antigravity/brain/82821ff4-3d9f-4538-9699-87264bbcc988';

const VIEWPORTS = [
  { name: 'Mobile (iPhone 12)', device: devices['iPhone 12'] },
  { name: 'Tablet (iPad Mini)', device: devices['iPad Mini'] }
];

const PAGES = [
  { name: 'Home', path: '/' },
  { name: 'Login', path: '/iniciar-sesion' },
  { name: 'Register', path: '/registrarse' },
  { name: 'Search', path: '/buscar' }
];

async function runVerification() {
  console.log('=== STARTING MOBILE, TABLET AND PWA VERIFICATION ===\n');

  // 1. Verify PWA manifest file existence and schema
  console.log('--- Checking PWA Manifest ---');
  try {
    const manifestPath = path.resolve('public/manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('manifest.json does not exist in public directory');
    }
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    console.log('✅ manifest.json exists and is valid JSON.');
    console.log(`   Name: "${manifest.name}"`);
    console.log(`   Short Name: "${manifest.short_name}"`);
    console.log(`   Display Mode: "${manifest.display}"`);
    console.log(`   Theme Color: "${manifest.theme_color}"`);
    console.log(`   Icons: ${manifest.icons?.length ?? 0} defined.`);
    
    if (!manifest.icons || manifest.icons.length === 0) {
      console.error('❌ Manifest has no icons defined.');
    }
  } catch (error) {
    console.error('❌ PWA Manifest verification failed:', error.message);
  }
  console.log('');

  // 2. Launch browser and verify layouts
  const browser = await chromium.launch({ headless: true });
  
  try {
    for (const view of VIEWPORTS) {
      console.log(`--- Testing Viewport: ${view.name} (${view.device.viewport.width}x${view.device.viewport.height}) ---`);
      
      const context = await browser.newContext({
        ...view.device,
        locale: 'es-CO'
      });
      
      const page = await context.newPage();
      
      // Track console errors
      const consoleErrors = [];
      page.on('pageerror', err => {
        consoleErrors.push(err.toString());
      });
      
      for (const target of PAGES) {
        const url = `${BASE_URL}${target.path}`;
        console.log(`   Navigating to ${target.name} (${url})...`);
        
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000); // Allow animations/layout to settle
        
        // Detect horizontal overflow
        const overflow = await page.evaluate(() => {
          const scrollWidth = document.documentElement.scrollWidth;
          const clientWidth = document.documentElement.clientWidth;
          return {
            scrollWidth,
            clientWidth,
            hasOverflow: scrollWidth > clientWidth
          };
        });
        
        if (overflow.hasOverflow) {
          console.warn(`      ⚠️  Layout overflow detected on ${target.name}: scrollWidth=${overflow.scrollWidth}px, clientWidth=${overflow.clientWidth}px`);
        } else {
          console.log(`      ✅ Layout fits perfectly (no horizontal scrollbar).`);
        }
        
        // Open the mobile menu before taking the screenshot of the Login page to inspect links
        if (target.path === '/iniciar-sesion') {
          try {
            console.log('      Toggling mobile menu open for inspection...');
            await page.click('button[aria-label="Abrir menú"]');
            await page.waitForTimeout(500); // Wait for open animation
          } catch (e) {
            console.warn('      Could not open mobile menu:', e.message);
          }
        }

        // Take a screenshot of Home and Login pages
        if (target.path === '/' || target.path === '/iniciar-sesion') {
          const screenshotName = `${view.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${target.name.toLowerCase()}.png`;
          const screenshotPath = path.join(ARTIFACT_DIR, screenshotName);
          await page.screenshot({ path: screenshotPath });
          console.log(`      📸 Screenshot saved: ${screenshotName}`);
        }
      }
      
      if (consoleErrors.length > 0) {
        console.error(`   ❌ Console errors detected for ${view.name}:`);
        consoleErrors.forEach(err => console.error(`      - ${err}`));
      } else {
        console.log(`   ✅ No javascript runtime errors detected on page load.`);
      }
      
      await context.close();
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error during browser verification:', error);
  } finally {
    await browser.close();
  }
  
  console.log('=== VERIFICATION COMPLETED ===');
}

runVerification();
