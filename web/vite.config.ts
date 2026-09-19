import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: { alias: { "@": path.resolve(process.cwd(), "src") } },
  server: { port: 5173 },
  build: {
    /*
     * Split the libraries out of the app chunk. They change on a dependency
     * bump, the app changes on every deploy; keeping them together meant a
     * copy edit invalidated React and the Supabase client in every visitor's
     * cache.
     */
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
