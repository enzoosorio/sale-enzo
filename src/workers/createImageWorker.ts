/**
 * The worker is pre-bundled by scripts/build-worker.mjs into /public/workers
 * (Turbopack doesn't bundle worker entry points), then loaded as a module.
 */
export function createImageWorker(): Worker {
  return new Worker("/workers/image-worker.js", { type: "module", name: "image-worker" });
}
