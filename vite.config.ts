import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
// https://vite.dev/config/

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
  ],
  server: {
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/react-router/") ||
              id.includes("/react-router-dom/")
            ) {
              return "vendor-react";
            }
            if (
              id.includes("/@reduxjs/toolkit/") ||
              id.includes("/react-redux/")
            ) {
              return "vendor-state";
            }
            if (id.includes("/libsodium")) {
              return "vendor-crypto";
            }
            if (
              id.includes("/i18next/") ||
              id.includes("/react-i18next/") ||
              id.includes("/@tolgee/")
            ) {
              return "vendor-i18n";
            }
            if (
              id.includes("/lucide-react/") ||
              id.includes("/luxon/") ||
              id.includes("/sonner/")
            ) {
              return "vendor-ui";
            }
          }
        },
      },
    },
  },
});
