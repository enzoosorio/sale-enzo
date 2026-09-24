import "server-only";
import { deleteObjects, putObject, publicUrl } from "@/lib/r2";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";

/**
 * Variant image storage for the manual admin form and /admin/images,
 * backed by Cloudflare R2 (public media bucket).
 * Legacy Supabase Storage URLs are still deletable until migrate-storage-to-r2 runs.
 */

const LEGACY_BUCKET = "variant-images";
const VALID_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

type UploadResult = { url: string | null; error: string | null };

function validate(file: File): string | null {
  if (!VALID_TYPES.includes(file.type)) return "Tipo de archivo inválido. Solo JPEG, PNG, WEBP y AVIF.";
  if (file.size > MAX_BYTES) return "El archivo excede el límite de 5MB.";
  return null;
}

/** Uploads to `variants/{variantId}/{name}.{ext}` and returns the public URL. */
export async function uploadVariantFile(file: File, variantId: string, name: string): Promise<UploadResult> {
  const invalid = validate(file);
  if (invalid) return { url: null, error: invalid };
  if (!/^[0-9a-f-]{36}$/i.test(variantId)) return { url: null, error: "Variante inválida" };

  try {
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
    const key = `variants/${variantId}/${name}.${extension}`;
    await putObject("media", key, new Uint8Array(await file.arrayBuffer()), file.type);
    return { url: publicUrl(key), error: null };
  } catch (e) {
    console.error("R2 upload error:", e);
    return { url: null, error: "Ocurrió un error inesperado durante la carga." };
  }
}

/** Deletes by public URL: R2 objects, or legacy Supabase Storage objects. */
export async function deleteVariantImageByUrl(imageUrl: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const url = new URL(imageUrl);
    const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
    if (r2Base && imageUrl.startsWith(r2Base)) {
      await deleteObjects("media", [url.pathname.replace(/^\//, "")]);
      return { success: true, error: null };
    }

    const parts = url.pathname.split("/");
    const bucketIndex = parts.indexOf(LEGACY_BUCKET);
    if (bucketIndex === -1) return { success: false, error: "Formato de URL de imagen inválido." };
    const { error } = await supabaseAdmin.storage.from(LEGACY_BUCKET).remove([parts.slice(bucketIndex + 1).join("/")]);
    return error ? { success: false, error: error.message } : { success: true, error: null };
  } catch (e) {
    console.error("Image deletion error:", e);
    return { success: false, error: "Ocurrió un error inesperado al eliminar." };
  }
}
