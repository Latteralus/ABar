import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The "@/*" -> "src/*" alias lives once in tsconfig.json's paths; Vite 8's built-in
// resolve.tsconfigPaths reads it from there natively, so the vite-tsconfig-paths plugin
// (needed on Vite 5) is no longer necessary.
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
});
