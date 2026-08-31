import { defineConfig } from "vite";

export default defineConfig({
  root: process.cwd(),
  server: {
    port: 4173,
    strictPort: true,
  },
});
