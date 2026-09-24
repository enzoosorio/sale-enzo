/// <reference lib="webworker" />
/**
 * Processes ONE photo per message (the queue feeds them sequentially to keep
 * iPhone memory in check):
 *   1. PUT the untouched original to R2 (private)
 *   2. remove background
 *   3. crop to the garment, encode full cutout + 1600px web cutout as WebP
 *   4. dominant colors from the web cutout
 *   5. PUT both cutouts to R2 (public)
 *
 * AGPL note: imgly is only reachable from this admin worker.
 */
import { alphaBoundingBox, dominantColors, fitWithin } from "@/lib/capture/imageOps";
import type { BackgroundRemover, BgProvider } from "@/lib/bg/types";

export interface PresignedUpload {
  kind: "original" | "cutout" | "web";
  key: string;
  url: string;
  contentType: string;
}

export interface WorkerJob {
  jobId: string;
  file: Blob;
  uploads: PresignedUpload[];
  provider: BgProvider;
}

export type WorkerMessage =
  | { type: "progress"; jobId: string; stage: "upload-original" | "model" | "remove-bg" | "encode" | "upload-cutouts"; fraction?: number }
  | {
      type: "done";
      jobId: string;
      result: {
        original_key: string;
        cutout_key: string;
        cutout_web_key: string;
        width: number;
        height: number;
        bytes_original: number;
        bytes_cutout: number;
        bytes_web: number;
        dominant_colors: string[];
        ms: number;
      };
    }
  | { type: "error"; jobId: string; error: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: WorkerMessage) => ctx.postMessage(msg);

const FULL_QUALITY = 90;
const WEB_QUALITY = 80;
const WEB_MAX_SIDE = 1600;

let remover: BackgroundRemover | null = null;
async function getRemover(provider: BgProvider): Promise<BackgroundRemover> {
  if (remover?.name === provider) return remover;
  remover =
    provider === "replicate"
      ? (await import("@/lib/bg/replicate")).replicateRemover
      : (await import("@/lib/bg/imgly")).imglyRemover;
  return remover;
}

async function put(upload: PresignedUpload, body: Blob): Promise<void> {
  const res = await fetch(upload.url, { method: "PUT", body, headers: { "content-type": upload.contentType } });
  if (!res.ok) throw new Error(`R2 upload ${upload.kind} failed: ${res.status}`);
}

/** Safari can't encode WebP via canvas; fall back to the jsquash WASM encoder. */
async function encodeWebp(canvas: OffscreenCanvas, quality: number): Promise<Blob> {
  const native = await canvas.convertToBlob({ type: "image/webp", quality: quality / 100 });
  if (native.type === "image/webp") return native;

  const { default: encode } = await import("@jsquash/webp/encode");
  const c2d = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  const pixels = c2d.getImageData(0, 0, canvas.width, canvas.height);
  const buffer = await encode(pixels, { quality, alpha_quality: 100, exact: 0 });
  return new Blob([buffer], { type: "image/webp" });
}

function draw(source: ImageBitmap | OffscreenCanvas, sx: number, sy: number, sw: number, sh: number, dw: number, dh: number) {
  const canvas = new OffscreenCanvas(dw, dh);
  const c2d = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  c2d.imageSmoothingQuality = "high";
  c2d.drawImage(source, sx, sy, sw, sh, 0, 0, dw, dh);
  return canvas;
}

async function process(job: WorkerJob): Promise<void> {
  const started = performance.now();
  const upload = (kind: PresignedUpload["kind"]) => {
    const u = job.uploads.find((x) => x.kind === kind);
    if (!u) throw new Error(`Missing presigned URL for ${kind}`);
    return u;
  };

  // 1. Original (untouched, full resolution)
  post({ type: "progress", jobId: job.jobId, stage: "upload-original" });
  const originalUpload = put(upload("original"), job.file);

  // 2. Background removal (runs while the original uploads)
  post({ type: "progress", jobId: job.jobId, stage: "remove-bg" });
  const bg = await getRemover(job.provider);
  const cutoutPng = await bg.remove(job.file, (fraction) =>
    post({ type: "progress", jobId: job.jobId, stage: "model", fraction }),
  );

  // 3. Crop to garment and encode
  post({ type: "progress", jobId: job.jobId, stage: "encode" });
  const bitmap = await createImageBitmap(cutoutPng);
  const scan = draw(bitmap, 0, 0, bitmap.width, bitmap.height, bitmap.width, bitmap.height);
  const scanCtx = scan.getContext("2d") as OffscreenCanvasRenderingContext2D;
  const box =
    alphaBoundingBox(scanCtx.getImageData(0, 0, scan.width, scan.height).data, scan.width, scan.height) ??
    { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
  bitmap.close();

  const full = draw(scan, box.x, box.y, box.width, box.height, box.width, box.height);
  const fullWebp = await encodeWebp(full, FULL_QUALITY);

  const webSize = fitWithin(box.width, box.height, WEB_MAX_SIDE);
  const web = draw(full, 0, 0, box.width, box.height, webSize.width, webSize.height);
  const webWebp = await encodeWebp(web, WEB_QUALITY);

  // 4. Colors from a small thumbnail of the cutout
  const thumbSize = fitWithin(box.width, box.height, 96);
  const thumb = draw(full, 0, 0, box.width, box.height, thumbSize.width, thumbSize.height);
  const thumbCtx = thumb.getContext("2d") as OffscreenCanvasRenderingContext2D;
  const colors = dominantColors(thumbCtx.getImageData(0, 0, thumb.width, thumb.height).data);

  // 5. Upload cutouts
  post({ type: "progress", jobId: job.jobId, stage: "upload-cutouts" });
  await Promise.all([put(upload("cutout"), fullWebp), put(upload("web"), webWebp), originalUpload]);

  post({
    type: "done",
    jobId: job.jobId,
    result: {
      original_key: upload("original").key,
      cutout_key: upload("cutout").key,
      cutout_web_key: upload("web").key,
      width: box.width,
      height: box.height,
      bytes_original: job.file.size,
      bytes_cutout: fullWebp.size,
      bytes_web: webWebp.size,
      dominant_colors: colors,
      ms: Math.round(performance.now() - started),
    },
  });
}

ctx.onmessage = (event: MessageEvent<WorkerJob>) => {
  process(event.data).catch((e: unknown) =>
    post({ type: "error", jobId: event.data.jobId, error: e instanceof Error ? e.message : String(e) }),
  );
};
