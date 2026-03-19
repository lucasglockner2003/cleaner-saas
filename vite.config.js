import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("react-router-dom")) {
            return "vendor-router";
          }
          if (id.includes("@supabase/supabase-js")) {
            return "vendor-supabase";
          }
          if (id.includes("react")) {
            return "vendor-react";
          }
          return "vendor";
        }
      }
    }
  }
});
