import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  root: process.cwd(),
  plugins: [tailwindcss()],
  server: {
    port: 4173,
    strictPort: true,
  },
});
