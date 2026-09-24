/** Removes the background of a photo, returning a PNG with transparency. */
export interface BackgroundRemover {
  readonly name: "imgly" | "replicate";
  remove(image: Blob, onProgress?: (fraction: number) => void): Promise<Blob>;
}

export type BgProvider = BackgroundRemover["name"];

export const bgProvider = (): BgProvider =>
  process.env.NEXT_PUBLIC_BG_PROVIDER === "replicate" ? "replicate" : "imgly";
