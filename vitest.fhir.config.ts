import { defineConfig } from 'vitest/config';

/**
 * Pruebas de interoperabilidad (IND-10): casos TC-01 a TC-10 de la sección
 * 6.3.3 contra un servidor HAPI FHIR R4 real, con datos sintéticos.
 *
 *   FHIR_BASE_URL=http://localhost:8080/fhir   HAPI en Docker (CI y respaldo)
 *   FHIR_BASE_URL=https://hapi.fhir.org/baseR4  servidor público de pruebas (demostración)
 *
 * Los casos dependen unos de otros (la carga inicial alimenta la reserva), así
 * que corren en orden y en un solo archivo.
 */
export default defineConfig({
  test: {
    include: ['fhir/pruebas/**/*.test.ts'],
    environment: 'node',
    testTimeout: 90_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    provide: {
      fhirBase: (process.env.FHIR_BASE_URL ?? 'http://localhost:8080/fhir').replace(/\/+$/, ''),
    },
    reporters: ['default', 'json'],
    outputFile: { json: 'fhir/reportes/ind-10.json' },
  },
});
