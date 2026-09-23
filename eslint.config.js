// Configuración de ESLint (flat config).
// Capa 1 de la estrategia de accesibilidad: análisis estático del JSX con
// eslint-plugin-jsx-a11y (reglas "strict"), antes de que el código se ejecute.
// Las capas 2 (axe-core en navegador) y 3 (Lighthouse CI) corren en el pipeline.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  { ignores: ['dist', 'coverage', '.lighthouseci', 'playwright-report', 'test-results', 'supabase/functions'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, jsxA11y.flatConfigs.strict],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.js', '*.config.{js,cjs,ts}', 'lighthouserc.cjs'],
    languageOptions: { globals: globals.node },
  },
);
