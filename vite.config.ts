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
});
