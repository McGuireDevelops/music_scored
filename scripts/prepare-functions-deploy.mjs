/**
 * Vendored copy of @learning-scores/shared for Firebase Cloud Build (npm does not support workspace:*).
 * Run after: pnpm --filter @learning-scores/shared run build
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sharedSrc = path.join(root, "packages", "shared");
const sharedDist = path.join(sharedSrc, "dist");
const destRoot = path.join(root, "functions", "_packages", "shared");

if (!fs.existsSync(sharedDist)) {
  console.error("Missing packages/shared/dist — run: pnpm --filter @learning-scores/shared run build");
  process.exit(1);
}

fs.rmSync(destRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(destRoot, "dist"), { recursive: true });

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

copyDir(sharedDist, path.join(destRoot, "dist"));

const pkg = {
  name: "@learning-scores/shared",
  version: "1.0.0",
  private: true,
  type: "module",
  main: "./dist/index.js",
  types: "./dist/index.d.ts",
  exports: {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
      default: "./dist/index.js",
    },
  },
  dependencies: {
    zod: "^3.22.4",
  },
};

fs.writeFileSync(path.join(destRoot, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
console.log("Prepared functions/_packages/shared for deploy.");
