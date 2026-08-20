import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/*
 * Configuración principal de Vite.
 *
 * La propiedad base indica que la aplicación será publicada
 * dentro del repositorio Biblioteca-Virtual en GitHub Pages.
 *
 * Sin esta configuración, Vite intentaría cargar los archivos
 * desde la raíz del dominio y los estilos o scripts no aparecerían.
 */
export default defineConfig({
  plugins: [
    react(),
  ],

  base: "/Biblioteca_Virtual/",
});
