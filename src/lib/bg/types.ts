/** Removes the background of a photo, returning a PNG with transparency. */
export interface BackgroundRemover {
  readonly name: "imgly" | "replicate";
  remove(image: Blob, onProgress?: (fraction: number) => void): Promise<Blob>;
}

export type BgProvider = BackgroundRemover["name"];

/**
 * Ordered provider chain for one photo. The on-device model goes first (free);
 * the server model (Replicate/BiRefNet) is the automatic fallback when the
 * cutout fails the quality gate or the first provider throws. Setting
 * NEXT_PUBLIC_BG_PROVIDER=replicate flips the order. An unconfigured Replicate
 * answers 501 and is simply skipped.
 */
export const bgProviders = (): BgProvider[] =>
  process.env.NEXT_PUBLIC_BG_PROVIDER === "replicate" ? ["replicate", "imgly"] : ["imgly", "replicate"];
