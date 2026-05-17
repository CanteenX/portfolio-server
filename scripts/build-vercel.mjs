import { build } from "esbuild";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const apiDir = resolve(root, "api");

rmSync(apiDir, { recursive: true, force: true });
mkdirSync(apiDir, { recursive: true });

writeFileSync(
  resolve(apiDir, "package.json"),
  JSON.stringify({ type: "commonjs" }, null, 2) + "\n"
);

await build({
  entryPoints: [resolve(root, "api-src/entry.ts")],
  outfile: resolve(apiDir, "[[...slug]].js"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: false,
  minify: false,
  packages: "external",
  logLevel: "info",
});
