"use server";

import { supabaseAdmin } from "./supabase-admin";

const BUCKET_NAME = "variant-images";

interface UploadResult {
  url: string | null;
  error: string | null;
}

/**
 * Upload a secondary variant image to deterministic storage path
 * 
 * Architecture: Model A - Variant-first storage
 * Path: /variants/{variantId}/secondary/secondary-{index}.{ext}
 * 
 * Rules:
 * - Variant MUST exist before calling this function
 * - Multiple secondary images allowed per variant
 * - Sequential indexing (0, 1, 2, ...)
 * - No temporary folders
 * 
 * @param file - The image file to upload
 * @param variantId - The variant UUID (must exist in database)
 * @param index - Sequential index for this image (0, 1, 2, ...)
 * @returns Object with url and error
 */
export async function uploadSecondaryVariantImage(
  file: File,
  variantId: string,
  index: number
): Promise<UploadResult> {
  try {
    // Validate file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      return {
        url: null,
        error: 'Tipo de archivo no válido. Use JPG, PNG, WEBP o AVIF'
      };
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        url: null,
        error: 'El archivo es demasiado grande. Máximo 5MB'
      };
    }

    // Get file extension
    const extension = file.name.split('.').pop()?.toLowerCase() || 'webp';

    // Deterministic path: /variants/{variantId}/secondary/secondary-{index}.{ext}
    const filePath = `variants/${variantId}/secondary/secondary-${index}.${extension}`;

    // Upload to Supabase Storage
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Secondary image upload error:", error);
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

  } catch (error: any) {
    console.error('Error in uploadSecondaryVariantImage:', error);
    return {
      url: null,
      error: error.message || 'Error inesperado al subir la imagen'
    };
  }
}
