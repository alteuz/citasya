/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Todos los íconos en un solo archivo. Sin esto, cada ícono que comparten dos
        // páginas queda en un archivo propio de pocos bytes, y la portada pedía ocho
        // de ellos antes de su primer pintado (más solicitudes en el camino del LCP).
        manualChunks: (id) => (id.includes('node_modules/lucide-react') ? 'iconos' : undefined),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // El núcleo FHIR compartido con la Edge Function también tiene pruebas unitarias
    // (sin red). Las de interoperabilidad contra HAPI van aparte: vitest.fhir.config.ts.
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/_shared/**/*.test.ts'],
    // Valores ficticios: ninguna prueba unitaria debe hablar con Supabase real.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'supabase/functions/_shared/**/*.ts'],
      exclude: ['src/**/*.test.{ts,tsx}', 'supabase/functions/_shared/**/*.test.ts', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text-summary', 'lcov'],
    },
  },
});
