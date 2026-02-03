import { uploadVariantImage } from "./storage";

interface UploadResult {
  url: string | null;
  error: string | null;
}

/**
 * Upload a secondary variant image to Supabase Storage
 * Used for additional images during product creation
 * 
 * @param file - The image file to upload
 * @param variantTempId - Temporary ID for the variant (format: temp-{timestamp}-{index})
 * @returns Object with url and error
 */
export async function uploadSecondaryVariantImage(
  file: File,
  variantTempId: string
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
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';

    // Create unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}.${extension}`;

    // Upload path: secondary/{tempVariantId}/{filename}
    const path = `secondary/${variantTempId}/${filename}`;

    // Upload to storage
    const result = await uploadVariantImage(file, path, 'variant-images');

    if (result.error) {
      return {
        url: null,
        error: result.error
      };
    }

    return {
      url: result.url,
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
