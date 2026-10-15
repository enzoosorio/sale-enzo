import { RetouchError, type RetouchImage, type RetouchProvider } from "./types";

/**
 * Gemini image editing through the Interactions API.
 *
 * Note: gemini-2.5-flash-image was shut down on 2026-10-02; the current image
 * models are gemini-nano-banana-2.1 and gemini-3.1-flash-lite-image (~$0.034 per
 * 1K image). The image API needs a Google AI Studio key with billing enabled;
 * a Gemini app subscription does not include it.
 */
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const TIMEOUT_MS = 55_000;

/**
 * The prompt is the guardrail: the edit must be invisible except for the wrinkles,
 * and real wear has to stay visible (this is a second-hand shop; hiding a stain
 * or a hole in a photo is a misrepresentation).
 */
export const IRON_PROMPT = [
  "Edit this product photo of a second-hand garment.",
  "Remove ONLY the small wrinkles and creases in the fabric so the garment looks neatly ironed and flat.",
  "Keep EXACTLY the same garment: same shape, silhouette and proportions, same colors, fabric texture, seams, stitching, buttons, zippers, logos, prints, labels, tags and any text.",
  "Do not add, remove, move, resize or redraw anything.",
  "Do NOT repair, hide or soften stains, holes, pilling, fading, tears, loose threads or any other real wear or damage: they must remain visible exactly as they are.",
  "Keep the same background, framing, crop and camera angle.",
  "Return only the edited image.",
].join(" ");

/**
 * The REST response shape of the Interactions API is not pinned down in the docs
 * (the SDKs expose `output_image.data`; REST nests image blocks under `steps`).
 * Find the first image payload wherever it is instead of trusting one path.
 */
export function findImagePayload(node: unknown, depth = 0): { data: string; mime: string } | null {
  if (!node || typeof node !== "object" || depth > 8) return null;
  const obj = node as Record<string, unknown>;
  const looksLikeImage =
    typeof obj.data === "string" &&
    obj.data.length > 200 &&
    (obj.type === "image" || (typeof obj.mime_type === "string" && obj.mime_type.startsWith("image/")));
  if (looksLikeImage) return { data: obj.data as string, mime: typeof obj.mime_type === "string" ? obj.mime_type : "image/jpeg" };
  for (const value of Array.isArray(node) ? node : Object.values(obj)) {
    const found = findImagePayload(value, depth + 1);
    if (found) return found;
  }
  return null;
}

export function geminiProvider(
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1",
  fetchImpl: typeof fetch = fetch,
): RetouchProvider {
  return {
    name: "gemini",
    async iron(input: RetouchImage): Promise<RetouchImage> {
      if (!apiKey) throw new RetouchError("GEMINI_API_KEY no está configurada", 501);

      const res = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          input: [
            { type: "text", text: IRON_PROMPT },
            { type: "image", mime_type: input.mime, data: Buffer.from(input.bytes).toString("base64") },
          ],
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      const text = await res.text();
      if (!res.ok) throw new RetouchError(`Gemini ${res.status}: ${text.slice(0, 300)}`, res.status);

      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new RetouchError("Gemini devolvió una respuesta que no es JSON", 502);
      }
      const image = findImagePayload(json);
      if (!image) throw new RetouchError("Gemini no devolvió una imagen (¿bloqueada por seguridad?)", 502);
      return { bytes: new Uint8Array(Buffer.from(image.data, "base64")), mime: image.mime };
    },
  };
}
