import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite"
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }
          if (id.includes("@tanstack/react-table")) {
            return "vendor-table";
          }
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform/resolvers") ||
            id.includes("zod")
          ) {
            return "vendor-forms";
          }
          if (
            id.includes("@radix-ui") ||
            id.includes("lucide-react") ||
            id.includes("cmdk") ||
            id.includes("vaul") ||
            id.includes("sonner")
          ) {
            return "vendor-ui";
          }
          if (
            id.includes("react-dom") ||
            id.includes("react-router") ||
            id.includes("@reduxjs/toolkit") ||
            id.includes("react-redux") ||
            id.includes("redux-persist") ||
            id.includes("scheduler") ||
            id.includes("use-sync-external-store") ||
            /[\\/]node_modules[\\/](react|redux)[\\/]/.test(id)
          ) {
            return "vendor-core";
          }
        },
      },
    },
  },
})
