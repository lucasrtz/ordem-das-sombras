import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base relativa: funciona em Vercel, Netlify e GitHub Pages (subpasta) sem ajuste.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
