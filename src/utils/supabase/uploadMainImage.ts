"use server";

import { supabaseAdmin } from "@/utils/supabase/supabase-admin";

const BUCKET_NAME = "variant-images";

/**
 * Upload main variant image to deterministic storage path
 * 
 * Architecture: Model A - Variant-first storage
 * Path: /variants/{variantId}/main/main-image-1.{ext}
 * 
 * Rules:
 * - Variant MUST exist before calling this function
 * - Only ONE main image per variant
 * - Uses upsert to allow replacement
 * - No temporary folders
 * 
 * @param file - The File object to upload
 * @param variantId - The variant UUID (must exist in database)
 * @returns The public URL or error
 */
export async function uploadMainVariantImage(
  file: File,
  variantId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];
    if (!validTypes.includes(file.type)) {
      return {
        url: null,
        error: "Tipo de archivo invalido. Solo se permiten JPEG, PNG, WEBP y AVIF."
      };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        url: null,
        error: "El archivo excede el limite de 5MB."
      };
    }

    // Get file extension
    const extension = file.name.split('.').pop()?.toLowerCase() || 'webp';
    
    // Deterministic path: /variants/{variantId}/main/main-image-1.{ext}
    const filePath = `variants/${variantId}/main/main-image-1.${extension}`;

    // Upload to Supabase Storage (upsert allows replacing main image)
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Storage upload error:", error);
      return {
        url: null,
        error: error.message
      };
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      error: null
    };

  } catch (error) {
    console.error("Unexpected error uploading main image:", error);
    return {
      url: null,
      error: "Ocurri\u00f3 un error inesperado durante la carga."
    };
  }
}
