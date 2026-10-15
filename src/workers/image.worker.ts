/// <reference lib="webworker" />
/**
 * Processes ONE photo per message (the queue feeds them sequentially to keep
 * iPhone memory in check).
 *
 * mode "photo" (default):
 *   1. PUT the untouched original to R2 (private)
 *   2. remove the background through an ordered provider chain; the first
 *      cutout that passes the quality gate wins, otherwise the best attempt is
 *      kept and flagged `needs_review`
 *   3. crop to the garment, encode full cutout + 1600px web cutout as WebP
 *   4. dominant colors from the web cutout
 *   5. PUT both cutouts to R2 (public)
 *
 * mode "ironed": same cutout pipeline over an already ironed JPEG (the output
 * of /api/admin/retouch); only the two ironed renditions are uploaded.
 *
 * mode "recut": the owner asked to redo the cutout of a stored photo (usually
 * with another provider); the original already lives in R2, so only the two
 * cutouts are uploaded.
 *
 * AGPL note: imgly is only reachable from this admin worker.
 */
import {
  alphaBoundingBox,
  assessCutout,
  betterVerdict,
  dominantColors,
  fitWithin,
  type CutoutQuality,
} from "@/lib/capture/imageOps";
import type { BackgroundRemover, BgProvider } from "@/lib/bg/types";

export interface PresignedUpload {
  kind: "original" | "cutout" | "web" | "ironed" | "ironed-web";
  key: string;
  url: string;
  contentType: string;
}

export interface WorkerJob {
  jobId: string;
  mode?: "photo" | "ironed" | "recut";
  file: Blob;
  uploads: PresignedUpload[];
  /** Ordered chain: the first provider whose cutout passes the quality gate wins. */
  providers: BgProvider[];
}

interface CutoutInfo {
  width: number;
  height: number;
  dominant_colors: string[];
  bg_provider: BgProvider;
  cutout_quality: CutoutQuality;
  /** The cutout didn't pass the quality gate with any provider: the owner must look at it. */
  needs_review: boolean;
  ms: number;
}

export interface PhotoResult extends CutoutInfo {
  original_key: string;
  cutout_key: string;
  cutout_web_key: string;
  bytes_original: number;
  bytes_cutout: number;
  bytes_web: number;
}

export interface RecutResult extends CutoutInfo {
  cutout_key: string;
  cutout_web_key: string;
  bytes_cutout: number;
  bytes_web: number;
}

export interface IronedResult extends CutoutInfo {
  ironed_key: string;
  ironed_web_key: string;
  bytes_ironed: number;
  bytes_ironed_web: number;
}

export type WorkerStage = "upload-original" | "model" | "remove-bg" | "fallback" | "encode" | "upload-cutouts";

export type WorkerMessage =
  | { type: "progress"; jobId: string; stage: WorkerStage; fraction?: number }
  | { type: "done"; jobId: string; mode: "photo"; result: PhotoResult }
  | { type: "done"; jobId: string; mode: "ironed"; result: IronedResult }
  | { type: "done"; jobId: string; mode: "recut"; result: RecutResult }
  | { type: "error"; jobId: string; error: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: WorkerMessage) => ctx.postMessage(msg);

const FULL_QUALITY = 90;
const WEB_QUALITY = 80;
const WEB_MAX_SIDE = 1600;
/** Models run at 1024px anyway; feeding 12 MP only costs memory and time (and request size for the API fallback). */
const MODEL_MAX_SIDE = 2048;
const QUALITY_SCAN_SIDE = 512;

const removers = new Map<BgProvider, BackgroundRemover>();
async function getRemover(provider: BgProvider): Promise<BackgroundRemover> {
  let remover = removers.get(provider);
  if (!remover) {
    remover =
      provider === "replicate"
        ? (await import("@/lib/bg/replicate")).replicateRemover
        : (await import("@/lib/bg/imgly")).imglyRemover;
    removers.set(provider, remover);
  }
  return remover;
}

/** PUT with one retry on network errors and 5xx. A 4xx (e.g. an expired presigned URL) fails at once. */
async function put(upload: PresignedUpload, body: Blob): Promise<void> {
  let failure = "network error";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(upload.url, { method: "PUT", body, headers: { "content-type": upload.contentType } });
      if (res.ok) return;
      failure = String(res.status);
      if (res.status < 500) break;
    } catch (e) {
      failure = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`R2 upload ${upload.kind} failed: ${failure}`);
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

const pixelsOf = (canvas: OffscreenCanvas) =>
  (canvas.getContext("2d") as OffscreenCanvasRenderingContext2D).getImageData(0, 0, canvas.width, canvas.height).data;

/** Downscales big phone photos before the models see them; anything undecodable goes through untouched. */
async function prepareModelInput(file: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = fitWithin(bitmap.width, bitmap.height, MODEL_MAX_SIDE);
    if (size.width === bitmap.width && size.height === bitmap.height) {
      bitmap.close();
      return file;
    }
    const canvas = draw(bitmap, 0, 0, bitmap.width, bitmap.height, size.width, size.height);
    bitmap.close();
    return await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
  } catch {
    return file;
  }
}

interface Attempt {
  provider: BgProvider;
  /** Full-resolution RGBA cutout, uncropped. */
  canvas: OffscreenCanvas;
  quality: CutoutQuality;
}

async function attemptCutout(
  provider: BgProvider,
  input: Blob,
  onProgress: (fraction: number) => void,
): Promise<Attempt> {
  const remover = await getRemover(provider);
  const png = await remover.remove(input, onProgress);
  const bitmap = await createImageBitmap(png);
  const canvas = draw(bitmap, 0, 0, bitmap.width, bitmap.height, bitmap.width, bitmap.height);
  bitmap.close();

  const small = fitWithin(canvas.width, canvas.height, QUALITY_SCAN_SIDE);
  const thumb = draw(canvas, 0, 0, canvas.width, canvas.height, small.width, small.height);
  return { provider, canvas, quality: assessCutout(pixelsOf(thumb), thumb.width, thumb.height) };
}

/**
 * Runs the provider chain until one cutout passes the gate. Providers that
 * throw (model not loaded, API unconfigured or down) are skipped; if every
 * provider throws, the last error surfaces.
 */
async function cutoutWithFallback(providers: BgProvider[], input: Blob, jobId: string): Promise<Attempt> {
  let best: Attempt | null = null;
  let lastError: unknown = null;

  for (const provider of [...new Set(providers)]) {
    try {
      const attempt = await attemptCutout(provider, input, (fraction) =>
        post({ type: "progress", jobId, stage: "model", fraction }),
      );
      if (!best || betterVerdict(attempt.quality.verdict, best.quality.verdict)) best = attempt;
      if (attempt.quality.verdict === "ok") break;
      post({ type: "progress", jobId, stage: "fallback" });
    } catch (e) {
      lastError = e;
      post({ type: "progress", jobId, stage: "fallback" });
    }
  }

  if (!best) throw lastError instanceof Error ? lastError : new Error("No background removal provider available");
  return best;
}

/** Crops the winning cutout to the garment and encodes both renditions. */
async function encodeRenditions(attempt: Attempt) {
  const { canvas } = attempt;
  // An empty mask has no box: keep the whole frame, but the verdict ("failed") flags it.
  const box =
    alphaBoundingBox(pixelsOf(canvas), canvas.width, canvas.height) ??
    { x: 0, y: 0, width: canvas.width, height: canvas.height };

  const full = draw(canvas, box.x, box.y, box.width, box.height, box.width, box.height);
  const fullWebp = await encodeWebp(full, FULL_QUALITY);

  const webSize = fitWithin(box.width, box.height, WEB_MAX_SIDE);
  const web = draw(full, 0, 0, box.width, box.height, webSize.width, webSize.height);
  const webWebp = await encodeWebp(web, WEB_QUALITY);

  // Colors from a small thumbnail of the cutout
  const thumbSize = fitWithin(box.width, box.height, 96);
  const thumb = draw(full, 0, 0, box.width, box.height, thumbSize.width, thumbSize.height);

  return { box, fullWebp, webWebp, colors: dominantColors(pixelsOf(thumb)) };
}

const uploadOf = (job: WorkerJob, kind: PresignedUpload["kind"]) => {
  const u = job.uploads.find((x) => x.kind === kind);
  if (!u) throw new Error(`Missing presigned URL for ${kind}`);
  return u;
};

async function process(job: WorkerJob): Promise<void> {
  const started = performance.now();
  const ironed = job.mode === "ironed";

  // 1. Original (untouched, full resolution) uploads while the models run
  let originalUpload: Promise<void> | null = null;
  if (job.mode === undefined || job.mode === "photo") {
    post({ type: "progress", jobId: job.jobId, stage: "upload-original" });
    originalUpload = put(uploadOf(job, "original"), job.file);
    originalUpload.catch(() => undefined); // surfaced below; don't leave it unhandled if the models throw first
  }

  // 2. Background removal with fallback
  post({ type: "progress", jobId: job.jobId, stage: "remove-bg" });
  const input = await prepareModelInput(job.file);
  const attempt = await cutoutWithFallback(job.providers, input, job.jobId);

  // 3-4. Crop, encode, colors
  post({ type: "progress", jobId: job.jobId, stage: "encode" });
  const { box, fullWebp, webWebp, colors } = await encodeRenditions(attempt);

  // 5. Upload
  post({ type: "progress", jobId: job.jobId, stage: "upload-cutouts" });
  const info: CutoutInfo = {
    width: box.width,
    height: box.height,
    dominant_colors: colors,
    bg_provider: attempt.provider,
    cutout_quality: attempt.quality,
    needs_review: attempt.quality.verdict !== "ok",
    ms: 0,
  };

  if (ironed) {
    const [fullUp, webUp] = [uploadOf(job, "ironed"), uploadOf(job, "ironed-web")];
    await Promise.all([put(fullUp, fullWebp), put(webUp, webWebp)]);
    post({
      type: "done",
      jobId: job.jobId,
      mode: "ironed",
      result: {
        ...info,
        ms: Math.round(performance.now() - started),
        ironed_key: fullUp.key,
        ironed_web_key: webUp.key,
        bytes_ironed: fullWebp.size,
        bytes_ironed_web: webWebp.size,
      },
    });
    return;
  }

  const [cutoutUp, webUp] = [uploadOf(job, "cutout"), uploadOf(job, "web")];
  if (job.mode === "recut") {
    await Promise.all([put(cutoutUp, fullWebp), put(webUp, webWebp)]);
    post({
      type: "done",
      jobId: job.jobId,
      mode: "recut",
      result: {
        ...info,
        ms: Math.round(performance.now() - started),
        cutout_key: cutoutUp.key,
        cutout_web_key: webUp.key,
        bytes_cutout: fullWebp.size,
        bytes_web: webWebp.size,
      },
    });
    return;
  }

  const originalUp = uploadOf(job, "original");
  await Promise.all([put(cutoutUp, fullWebp), put(webUp, webWebp), originalUpload]);
  post({
    type: "done",
    jobId: job.jobId,
    mode: "photo",
    result: {
      ...info,
      ms: Math.round(performance.now() - started),
      original_key: originalUp.key,
      cutout_key: cutoutUp.key,
      cutout_web_key: webUp.key,
      bytes_original: job.file.size,
      bytes_cutout: fullWebp.size,
      bytes_web: webWebp.size,
    },
  });
}

ctx.onmessage = (event: MessageEvent<WorkerJob>) => {
  process(event.data).catch((e: unknown) =>
    post({ type: "error", jobId: event.data.jobId, error: e instanceof Error ? e.message : String(e) }),
  );
};
