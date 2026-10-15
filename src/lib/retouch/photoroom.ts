import { RetouchError, type RetouchImage, type RetouchProvider } from "./types";

/**
 * PhotoRoom Image Editing API (Plus plan): `ironing.mode=ai.auto`.
 * Output is rescaled to ~1K, and PhotoRoom warns that edits can introduce
 * alterations. A sandbox key is free but watermarks the output, which is enough
 * to judge quality before paying. Billing is per generated call.
 */
const ENDPOINT = "https://image-api.photoroom.com/v2/edit";
const TIMEOUT_MS = 55_000;

export function photoroomProvider(
  apiKey = process.env.PHOTOROOM_API_KEY,
  fetchImpl: typeof fetch = fetch,
): RetouchProvider {
  return {
    name: "photoroom",
    async iron(input: RetouchImage): Promise<RetouchImage> {
      if (!apiKey) throw new RetouchError("PHOTOROOM_API_KEY no está configurada", 501);

      const form = new FormData();
      form.append("imageFile", new Blob([Buffer.from(input.bytes)], { type: input.mime }), "garment.jpg");
      form.append("ironing.mode", "ai.auto");
      // Background removal stays on our side (same worker, same quality gate).
      form.append("removeBackground", "false");

      const res = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: { "x-api-key": apiKey },
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new RetouchError(`PhotoRoom ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status);

      return { bytes: new Uint8Array(await res.arrayBuffer()), mime: res.headers.get("content-type") ?? "image/png" };
    },
  };
}
