import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0", // required inside Docker
    port: 5173,
    proxy: {
      // In Docker: VITE_API_URL = http://backend:4000 (container-to-container)
      // Locally:   VITE_API_URL = http://localhost:4000
      "/api": {
        target: process.env.VITE_API_URL ?? "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
