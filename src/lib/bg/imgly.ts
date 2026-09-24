import type { BackgroundRemover } from "./types";

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
    const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;
    return removeBackground(image, {
      model: hasWebGPU ? "isnet_fp16" : "isnet_quint8",
      device: hasWebGPU ? "gpu" : "cpu",
      output: { format: "image/png" },
      progress: (key, current, total) => {
        if (key.startsWith("fetch") && total > 0) onProgress?.(current / total);
      },
    });
  },
};
