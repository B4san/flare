import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // lottie-react 2.4.2 trae "browser": "build/index.umd.js": Vite y
      // Rollup resuelven ese UMD y su default es el objeto `exports`
      // completo, no el componente → React error #130 en runtime (el build
      // de tipos pasa, el navegador crashea). El build ESM real es
      // build/index.es.js (`export { Lottie as default }`); este alias lo
      // fuerza en dev y en build. No tocar sin re-verificar en navegador.
      "lottie-react": fileURLToPath(
        new URL("./node_modules/lottie-react/build/index.es.js", import.meta.url),
      ),
    },
  },
  // Los datos de los ejemplos viven en ~/workspace/flare/examples/ (fuera
  // de app/): el dev server necesita permiso para leerlos. El build los
  // empaqueta dentro del deploy, así que en producción no hay fetch ni 404.
  server: {
    fs: {
      allow: [fileURLToPath(new URL("../../..", import.meta.url))],
    },
  },
});
