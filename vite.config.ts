import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// The "@/*" -> "src/*" alias lives once in tsconfig.json's paths; this plugin reads it from
// there instead of duplicating the mapping here and in vitest.config.ts.
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
});
