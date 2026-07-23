/**
 * Punto de entrada del frontend.
 *
 * Aquí monto la aplicación React dentro del elemento #root y cargo las hojas
 * de estilo en un orden específico. Las últimas hojas pueden corregir o
 * complementar reglas anteriores sin tocar la lógica de los componentes.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";

import "./index.css";
import "./components/ModuloLibros.css";
import "./components/TemaUniforme.css";
import "./components/AjustesFinales.css";
import "./components/CorreccionVisualFinal.css";
import "./components/TablasUniformes.css";
import "./components/FotoPerfil.css";

// React StrictMode me ayuda a detectar efectos o prácticas problemáticas
// durante el desarrollo; no cambia la interfaz que verá el usuario.
createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    <App />
  </StrictMode>
);