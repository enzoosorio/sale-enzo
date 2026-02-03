"use server";

import { supabaseAdmin } from "@/utils/supabase/supabase-admin";

const BUCKET_NAME = "variant-images";

/**
 * Upload main variant image to Supabase Storage
 * Path: /main/{variant_temp_id}/{timestamp}.{ext}
 * 
 * @param file - The File object to upload
 * @param tempId - Temporary ID for organizing (before variant is created)
 * @returns The public URL or error
 */
export async function uploadMainVariantImage(
  file: File,
  tempId: string
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
    
    // Build file path
    const timestamp = Date.now();
    const filePath = `main/${tempId}/${timestamp}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
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
