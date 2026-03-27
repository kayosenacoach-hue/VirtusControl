import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

window.addEventListener('vite:preloadError', (event) => {
  console.warn('O site foi atualizado. Recarregando os ficheiros novos...', event);
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);