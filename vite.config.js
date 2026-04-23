import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": process.env.VITE_API_URL || "http://localhost:5000",
    },
  },
  preview: {
    host: true,
    port: process.env.PORT || 4173,
    allowedHosts: [
      "tour-infinity-frontend.onrender.com",
      "localhost",
      "127.0.0.1"
    ]
  }
});
