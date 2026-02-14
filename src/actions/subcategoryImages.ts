"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface SubcategoryImage {
  id: string;
  subcategory_id: string;
  image_url: string;
  created_at: string;
}

interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

const MAX_IMAGES_PER_SUBCATEGORY = 6;
const STORAGE_BUCKET = "subcategory-images";

/**
 * Get all images for a specific subcategory
 */
export async function getSubcategoryImages(subcategoryId: string): Promise<ActionResult<SubcategoryImage[]>> {
  try {
    if (!subcategoryId) {
      return {
        success: false,
        error: "ID de subcategoría requerido"
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("subcategory_images")
      .select("*")
      .eq("subcategory_id", subcategoryId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching subcategory images:", error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error: any) {
    console.error("Unexpected error in getSubcategoryImages:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al obtener imágenes"
    };
  }
}

/**
 * Upload images for a subcategory
 * Handles multiple file uploads and stores their URLs in the database
 */
export async function uploadSubcategoryImages(
  subcategoryId: string,
  formData: FormData
): Promise<ActionResult<SubcategoryImage[]>> {
  try {
    if (!subcategoryId) {
      return {
        success: false,
        error: "ID de subcategoría requerido"
      };
    }

    const supabase = await createClient();

    // Check current image count
    const { data: existingImages, error: countError } = await supabase
      .from("subcategory_images")
      .select("id")
      .eq("subcategory_id", subcategoryId);

    if (countError) {
      console.error("Error checking existing images:", countError);
      return {
        success: false,
        error: countError.message
      };
    }

    const currentCount = existingImages?.length || 0;

    // Get all files from FormData
    const files: File[] = [];
    const entries = Array.from(formData.entries());
    
    for (const [key, value] of entries) {
      if (value instanceof File && value.size > 0) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return {
        success: false,
        error: "No se seleccionaron archivos"
      };
    }

    // Check if adding these files would exceed the limit
    if (currentCount + files.length > MAX_IMAGES_PER_SUBCATEGORY) {
      return {
        success: false,
        error: `Máximo ${MAX_IMAGES_PER_SUBCATEGORY} imágenes permitidas. Actualmente tienes ${currentCount}.`
      };
    }

    const uploadedImages: SubcategoryImage[] = [];

    // Upload each file and create database record
    for (const file of files) {
      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileExt = file.name.split('.').pop();
      const filePath = `${subcategoryId}/${timestamp}-${randomStr}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        // Continue with other files, but track error
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      // Insert record into database
      const { data: imageRecord, error: dbError } = await supabase
        .from("subcategory_images")
        .insert({
          subcategory_id: subcategoryId,
          image_url: publicUrl
        })
        .select()
        .single();

      if (dbError) {
        console.error("Error creating image record:", dbError);
        // Try to delete the uploaded file
        await supabase.storage.from(STORAGE_BUCKET).remove([filePath  ]);
        continue;
      }

      if (imageRecord) {
        uploadedImages.push(imageRecord);
      }
    }

    if (uploadedImages.length === 0) {
      return {
        success: false,
        error: "No se pudo subir ninguna imagen"
      };
    }

    // Revalidate the admin categories page
    revalidatePath('/admin/categories');

    return {
      success: true,
      data: uploadedImages
    };

  } catch (error: any) {
    console.error("Unexpected error in uploadSubcategoryImages:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al subir imágenes"
    };
  }
}

/**
 * Delete a single subcategory image
 * Removes from storage and database
 */
export async function deleteSubcategoryImage(imageId: string): Promise<ActionResult<void>> {
  try {
    if (!imageId) {
      return {
        success: false,
        error: "ID de imagen requerido"
      };
    }

    const supabase = await createClient();

    // Get image record to extract storage path
    const { data: imageRecord, error: fetchError } = await supabase
      .from("subcategory_images")
      .select("image_url")
      .eq("id", imageId)
      .single();

    if (fetchError || !imageRecord) {
      console.error("Error fetching image record:", fetchError);
      return {
        success: false,
        error: "Imagen no encontrada"
      };
    }

    // Extract file path from URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/subcategory-images/[path]
    const url = new URL(imageRecord.image_url);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf(STORAGE_BUCKET);
    const filePath = pathParts.slice(bucketIndex + 1).join('/');

    // Delete from storage
    const { error: storageError } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
      // Continue to delete DB record even if storage delete fails
    }

    // Delete database record
    const { error: dbError } = await supabase
      .from("subcategory_images")
      .delete()
      .eq("id", imageId);

    if (dbError) {
      console.error("Error deleting image record:", dbError);
      return {
        success: false,
        error: dbError.message
      };
    }

    // Revalidate the admin categories page
    revalidatePath('/admin/categories');

    return {
      success: true
    };

  } catch (error: any) {
    console.error("Unexpected error in deleteSubcategoryImage:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al eliminar imagen"
    };
  }
}
