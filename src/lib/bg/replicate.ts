import type { BackgroundRemover } from "./types";

/** Server-side BiRefNet via /api/admin/bg (Replicate). Used when on-device quality/speed isn't enough. */
export const replicateRemover: BackgroundRemover = {
  name: "replicate",
  async remove(image) {
    const res = await fetch("/api/admin/bg", {
      method: "POST",
      body: image,
      headers: { "content-type": image.type || "image/jpeg" },
      credentials: "include",
    });
    if (!res.ok) throw new Error(`bg ${res.status}: ${await res.text()}`);
    return res.blob();
  },
};
