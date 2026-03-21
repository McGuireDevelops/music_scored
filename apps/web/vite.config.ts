import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@learning-scores/shared": path.join(repoRoot, "packages/shared/src/index.ts"),
      "@learning-scores/firebase": path.join(repoRoot, "packages/firebase/src/index.ts"),
    },
  },
  build: {
    outDir: "dist",
  },
});
