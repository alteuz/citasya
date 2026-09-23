/**
 * Lighthouse CI — gate de rendimiento y accesibilidad (capa 3).
 *
 * Perfil seleccionado con LHCI_PROFILE=movil|escritorio. Los umbrales son los
 * de la hipótesis del trabajo de grado, declarados por dispositivo (R-01).
 * Se ejecutan 3 corridas por URL y se evalúa la MEDIANA, para reducir la
 * variabilidad propia de las mediciones de rendimiento.
 */
const PROFILE = process.env.LHCI_PROFILE === 'escritorio' ? 'escritorio' : 'movil';

const THRESHOLDS = {
  movil: { performance: 0.85, accessibility: 0.98, lcpMs: 2500 },
  escritorio: { performance: 0.95, accessibility: 0.98, lcpMs: 2500 },
}[PROFILE];

const BASE = 'http://localhost:4173';

module.exports = {
  ci: {
    collect: {
      // Servidor estático con compresión gzip y fallback SPA, para emular la
      // CDN de producción (vite preview no comprime y sesgaría el LCP).
      startServerCommand: 'npm run serve:dist',
      startServerReadyPattern: 'Accepting connections',
      url: ['/', '/iniciar-sesion', '/registrarse', '/directorio-eps', '/buscar'].map((p) => BASE + p),
      numberOfRuns: 3,
      settings: {
        ...(PROFILE === 'escritorio' ? { preset: 'desktop' } : {}),
        locale: 'es',
        chromeFlags: '--headless=new --no-sandbox',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: THRESHOLDS.performance, aggregationMethod: 'median' }],
        'categories:accessibility': ['error', { minScore: THRESHOLDS.accessibility, aggregationMethod: 'median' }],
        'largest-contentful-paint': ['error', { maxNumericValue: THRESHOLDS.lcpMs, aggregationMethod: 'median' }],
        'categories:best-practices': ['warn', { minScore: 0.95, aggregationMethod: 'median' }],
        'categories:seo': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: `.lighthouseci/reportes-${PROFILE}`,
    },
  },
};
