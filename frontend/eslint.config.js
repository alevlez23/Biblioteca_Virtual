/**
 * Reglas de calidad para los archivos JavaScript y JSX.
 * ESLint detecta variables sin usar, errores comunes de Hooks y problemas que
 * podrían impedir la actualización rápida de React.
 */
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // dist contiene archivos generados por Vite y no se revisa manualmente.
  globalIgnores(['dist']),
  {
    // Estas reglas se aplican al código fuente del frontend.
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
