/**
 * Configuración del servidor y compilador Vite.
 * El plugin de React transforma JSX y habilita la actualización rápida durante
 * el desarrollo sin recargar toda la página.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// defineConfig ofrece autocompletado y valida la estructura de configuración.
export default defineConfig({
  plugins: [react()],
})
