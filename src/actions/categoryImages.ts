"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface CategoryImage {
  id: string;
  category_id: string;
  image_url: string;
  orientation: "portrait" | "landscape";
  created_at: string;
}

interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

const MAX_IMAGES_PER_CATEGORY = 6;
const STORAGE_BUCKET = "category-images";

/**
 * Get all images for a specific category (works for both parent categories and subcategories)
 */
export async function getCategoryImages(categoryId: string): Promise<ActionResult<CategoryImage[]>> {
  try {
    if (!categoryId) {
      return {
        success: false,
        error: "ID de categoría requerido"
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("category_images")
      .select("*")
      .eq("category_id", categoryId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching category images:", error);
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
    console.error("Unexpected error in getCategoryImages:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al obtener imágenes"
    };
  }
}

/**
 * Upload images for a category (works for both parent categories and subcategories)
 * Handles multiple file uploads and stores their URLs in the database
 * 
 * @param categoryId - UUID of the category (can be parent or subcategory)
 * @param formData - FormData containing files and orientations
 *                   Expected format: file-0, file-1, etc. for files
 *                                   orientation-0, orientation-1, etc. for orientations
 */
export async function uploadCategoryImages(
  categoryId: string,
  formData: FormData
): Promise<ActionResult<CategoryImage[]>> {
  try {
    if (!categoryId) {
      return {
        success: false,
        error: "ID de categoría requerido"
      };
    }

    const supabase = await createClient();

    // Check current image count
    const { data: existingImages, error: countError } = await supabase
      .from("category_images")
      .select("id")
      .eq("category_id", categoryId);

    if (countError) {
      console.error("Error checking existing images:", countError);
      return {
        success: false,
        error: countError.message
      };
    }

    const currentCount = existingImages?.length || 0;

    // Get all files and orientations from FormData
    const files: Array<{ file: File; orientation: "portrait" | "landscape" }> = [];
    const entries = Array.from(formData.entries());
    
    // First pass: collect files with their indices
    const fileMap = new Map<number, File>();
    const orientationMap = new Map<number, "portrait" | "landscape">();
    
    for (const [key, value] of entries) {
      if (key.startsWith('file-') && value instanceof File && value.size > 0) {
        const index = parseInt(key.replace('file-', ''));
        fileMap.set(index, value);
      } else if (key.startsWith('orientation-') && typeof value === 'string') {
        const index = parseInt(key.replace('orientation-', ''));
        const orientation = value as "portrait" | "landscape";
        if (orientation === "portrait" || orientation === "landscape") {
          orientationMap.set(index, orientation);
        }
      }
    }

    // Second pass: match files with orientations
    for (const [index, file] of fileMap.entries()) {
      const orientation = orientationMap.get(index) || "portrait"; // Default to portrait
      files.push({ file, orientation });
    }

    if (files.length === 0) {
      return {
        success: false,
        error: "No se seleccionaron archivos"
      };
    }

    // Check if adding these files would exceed the limit
    if (currentCount + files.length > MAX_IMAGES_PER_CATEGORY) {
      return {
        success: false,
        error: `Máximo ${MAX_IMAGES_PER_CATEGORY} imágenes permitidas. Actualmente tienes ${currentCount}.`
      };
    }

    const uploadedImages: CategoryImage[] = [];

    // Upload each file and create database record
    for (const { file, orientation } of files) {
      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileExt = file.name.split('.').pop();
      const filePath = `${categoryId}/${timestamp}-${randomStr}.${fileExt}`;

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
        .from("category_images")
        .insert({
          category_id: categoryId,
          image_url: publicUrl,
          orientation: orientation
        })
        .select()
        .single();

      if (dbError) {
        console.error("Error creating image record:", dbError);
        // Try to delete the uploaded file
        await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
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
    console.error("Unexpected error in uploadCategoryImages:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al subir imágenes"
    };
  }
}

/**
 * Delete a single category image
 * Removes from storage and database
 */
export async function deleteCategoryImage(imageId: string): Promise<ActionResult<void>> {
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
      .from("category_images")
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
    // URL format: https://[project].supabase.co/storage/v1/object/public/category-images/[path]
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
      .from("category_images")
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
    console.error("Unexpected error in deleteCategoryImage:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al eliminar imagen"
    };
  }
}

/**
 * Update the orientation of a category image
 */
export async function updateCategoryImageOrientation(
  imageId: string,
  orientation: "portrait" | "landscape"
): Promise<ActionResult<CategoryImage>> {
  try {
    if (!imageId) {
      return {
        success: false,
        error: "ID de imagen requerido"
      };
    }

    if (orientation !== "portrait" && orientation !== "landscape") {
      return {
        success: false,
        error: "Orientación inválida. Debe ser 'portrait' o 'landscape'"
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("category_images")
      .update({ orientation })
      .eq("id", imageId)
      .select()
      .single();

    if (error) {
      console.error("Error updating image orientation:", error);
      return {
        success: false,
        error: error.message
      };
    }

    // Revalidate the admin categories page
    revalidatePath('/admin/categories');

    return {
      success: true,
      data
    };

  } catch (error: any) {
    console.error("Unexpected error in updateCategoryImageOrientation:", error);
    return {
      success: false,
      error: error.message || "Error inesperado al actualizar orientación"
    };
  }
}

// Export type for use in components
export type { CategoryImage };
