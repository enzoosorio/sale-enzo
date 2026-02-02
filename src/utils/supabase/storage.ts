import { supabaseAdmin } from "./supabase-admin";

const BUCKET_NAME = "variant-images";

/**
 * Upload an image file to Supabase Storage
 * Path structure: /variants/{variant_id}/{image_id}.webp
 * 
 * @param file - The file to upload
 * @param variantId - The variant UUID
 * @param imageId - The image UUID (used as filename)
 * @returns The public URL of the uploaded image or null on error
 */
export async function uploadVariantImage(
  file: File,
  variantId: string,
  imageId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];
    if (!validTypes.includes(file.type)) {
      return {
        url: null,
        error: "Invalid file type. Only JPEG, PNG, WEBP, and AVIF are allowed."
      };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        url: null,
        error: "File size exceeds 5MB limit."
      };
    }

    // Get file extension
    const extension = file.name.split('.').pop()?.toLowerCase() || 'webp';
    
    // Build file path
    const filePath = `variants/${variantId}/${imageId}.${extension}`;

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
    console.error("Unexpected error uploading image:", error);
    return {
      url: null,
      error: "An unexpected error occurred during upload."
    };
  }
}

/**
 * Delete an image file from Supabase Storage
 * 
 * @param imageUrl - The full public URL of the image
 * @returns Success status and error message if any
 */
export async function deleteVariantImageFromStorage(
  imageUrl: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Extract the file path from the URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/variant-images/variants/...
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    
    // Find the bucket name index and extract path after it
    const bucketIndex = pathParts.indexOf(BUCKET_NAME);
    if (bucketIndex === -1) {
      return {
        success: false,
        error: "Invalid image URL format."
      };
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');

    if (!filePath) {
      return {
        success: false,
        error: "Could not extract file path from URL."
      };
    }

    // Delete from storage
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("Storage deletion error:", error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      error: null
    };

  } catch (error) {
    console.error("Unexpected error deleting image:", error);
    return {
      success: false,
      error: "An unexpected error occurred during deletion."
    };
  }
}

/**
 * Get the public URL for a file in storage
 * 
 * @param filePath - The path to the file in storage (e.g., "variants/{variant_id}/{image_id}.webp")
 * @returns The public URL
 */
export function getPublicUrl(filePath: string): string {
  const { data } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * List all files for a specific variant
 * 
 * @param variantId - The variant UUID
 * @returns List of files or error
 */
export async function listVariantImages(variantId: string) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(`variants/${variantId}`, {
        limit: 100,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      console.error("Error listing variant images:", error);
      return {
        files: null,
        error: error.message
      };
    }

    return {
      files: data,
      error: null
    };

  } catch (error) {
    console.error("Unexpected error listing images:", error);
    return {
      files: null,
      error: "An unexpected error occurred."
    };
  }
}
