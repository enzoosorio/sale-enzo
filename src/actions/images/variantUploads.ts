"use server";

import { getAdminUserId } from "@/lib/auth/isAdmin";
import { uploadVariantFile } from "@/lib/storage/variantImages";

type UploadResult = { url: string | null; error: string | null };

const unauthorized: UploadResult = { url: null, error: "Unauthorized: Admin access required" };

/** Main image for the manual product form. Path: variants/{variantId}/main-1.{ext} */
export async function uploadMainVariantImage(file: File, variantId: string): Promise<UploadResult> {
  if (!(await getAdminUserId())) return unauthorized;
  return uploadVariantFile(file, variantId, "main-1");
}

/** Secondary image for the manual product form. Path: variants/{variantId}/secondary-{index}.{ext} */
export async function uploadSecondaryVariantImage(file: File, variantId: string, index: number): Promise<UploadResult> {
  if (!(await getAdminUserId())) return unauthorized;
  if (!Number.isInteger(index) || index < 0 || index > 50) return { url: null, error: "Índice inválido" };
  return uploadVariantFile(file, variantId, `secondary-${index}`);
}
