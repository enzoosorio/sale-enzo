/**
 * Bundles the capture image worker into public/workers/.
 *
 * Turbopack (next build) copies `new Worker(new URL("./x.ts", import.meta.url))`
 * targets as raw assets instead of bundling them, so the worker is built here
 * with esbuild and served as a static module. Runs on predev/prebuild.
 */
import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const OUT = "public/workers";
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

await build({
  entryPoints: { "image-worker": "src/workers/image.worker.ts" },
  outdir: OUT,
  bundle: true,
  splitting: true, // imgly + jsquash load lazily as separate chunks
  format: "esm",
  platform: "browser",
  target: "es2020",
  minify: true,
  sourcemap: false,
  tsconfig: "tsconfig.json",
  define: {
    "process.env.NEXT_PUBLIC_BG_PROVIDER": JSON.stringify(process.env.NEXT_PUBLIC_BG_PROVIDER ?? "imgly"),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  logLevel: "warning",
});

// Emscripten locates its .wasm next to the chunk that loads it
for (const file of ["webp_enc.wasm", "webp_enc_simd.wasm"]) {
  await cp(`node_modules/@jsquash/webp/codec/enc/${file}`, `${OUT}/${file}`);
}

console.log(`✓ worker bundled → ${OUT}`);
