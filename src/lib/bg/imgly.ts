import type { BackgroundRemover } from "./types";

/** A real adapter, not just the API's presence: `"gpu" in navigator` is true on browsers without a usable GPU. */
async function hasUsableWebGPU(): Promise<boolean> {
  try {
    const gpu = (globalThis.navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown | null> } }).gpu;
    return !!gpu && (await gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}

/**
 * On-device background removal (ONNX, WebGPU → WASM fallback).
 * The model is downloaded once from IMG.LY's CDN and cached by the browser.
 *
 * LICENSE: @imgly/background-removal is AGPL-3.0. It must only ever be
 * imported from the admin capture worker, never from public storefront code.
 */
export const imglyRemover: BackgroundRemover = {
  name: "imgly",
  async remove(image, onProgress) {
    const { removeBackground } = await import("@imgly/background-removal");
    const gpu = await hasUsableWebGPU();
    return removeBackground(image, {
      model: gpu ? "isnet_fp16" : "isnet_quint8",
      device: gpu ? "gpu" : "cpu",
      output: { format: "image/png" },
      progress: (key, current, total) => {
        if (key.startsWith("fetch") && total > 0) onProgress?.(current / total);
      },
    });
  },
};
