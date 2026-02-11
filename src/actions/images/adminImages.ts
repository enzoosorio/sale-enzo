"use server";

import { getAdminUserId } from "@/lib/auth/isAdmin";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";
import { ActionResult } from "@/types/action/action-result";
import { revalidatePath } from "next/cache";

type ImagePosition = "random" | "front" | "back" | "logo_detail" | "close_detail";

const BUCKET_NAME = "variant-images";

/**
 * Get variant information for images page
 */
export async function getVariantInfo(variantId: string) {
  try {
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
        data: null
      };
    }

    const { data, error } = await supabaseAdmin
      .from("product_variants")
      .select(`
        id,
        product_id,
        size,
        gender,
        fit,
        main_img_url,
        main_color_hex,
        products!inner (
          id,
          name,
          brand,
          product_categories (
            name,
            slug
          )
        )
      `)
      .eq("id", variantId)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: "Variant not found",
        data: null
      };
    }

    // Count additional images
    const { count } = await supabaseAdmin
      .from("variant_images")
      .select("*", { count: "exact", head: true })
      .eq("variant_id", variantId);

    // Handle products data - Supabase may return it as array or object
    const productData = Array.isArray(data.products) ? data.products[0] : data.products;
    
    if (!productData) {
      return {
        success: false,
        error: "Product data not found for variant",
        data: null
      };
    }

    return {
      success: true,
      data: {
        variant: {
          id: data.id,
          product_id: data.product_id,
          size: data.size,
          gender: data.gender,
          fit: data.fit,
          main_img_url: data.main_img_url,
          main_color_hex: data.main_color_hex
        },
        product: {
          id: productData.id,
          name: productData.name,
          brand: productData.brand,
          product_categories: productData.product_categories
        },
        additionalImagesCount: count || 0
      },
      error: null
    };

  } catch (error) {
    console.error("Error in getVariantInfo:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
      data: null
    };
  }
}

/**
 * Get variant images with positions
 */
export async function getVariantImages(variantId: string) {
  try {
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
        data: null
      };
    }

    const { data, error } = await supabaseAdmin
      .from("variant_images")
      .select("*")
      .eq("variant_id", variantId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching variant images:", error);
      return {
        success: false,
        error: "Failed to fetch images",
        data: null
      };
    }

    return {
      success: true,
      data: data || [],
      error: null
    };

  } catch (error) {
    console.error("Error in getVariantImages:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
      data: null
    };
  }
}

/**
 * Upload a variant image with position
 */
export async function uploadVariantImage(formData: FormData): Promise<ActionResult<{ id: string; image_url: string }>> {
  try {
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required"
      };
    }

    const file = formData.get("file") as File;
    const variantId = formData.get("variant_id") as string;
    const position = (formData.get("position") as ImagePosition) || "random";

    if (!file || !variantId) {
      return {
        success: false,
        error: "Missing required fields"
      };
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Use JPG, PNG, WEBP, or AVIF"
      };
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: "File too large. Maximum 5MB"
      };
    }

    // Get current count to determine index
    const { count } = await supabaseAdmin
      .from("variant_images")
      .select("*", { count: "exact", head: true })
      .eq("variant_id", variantId);

    const index = count || 0;
    const extension = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const filePath = `variants/${variantId}/secondary/secondary-${index}.${extension}`;

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return {
        success: false,
        error: uploadError.message
      };
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // Insert into database
    const { data: dbData, error: dbError } = await supabaseAdmin
      .from("variant_images")
      .insert({
        variant_id: variantId,
        image_url: urlData.publicUrl,
        position: position
      })
      .select()
      .single();

    if (dbError || !dbData) {
      console.error("Database insert error:", dbError);
      return {
        success: false,
        error: "Failed to save image record"
      };
    }
    
    // Validate returned data
    if (!dbData.id || !dbData.image_url || typeof dbData.image_url !== "string") {
      return {
        success: false,
        error: "Invalid data returned from database"
      };
    }

    const formattedData: { id: string; image_url: string } = {
      id: dbData.id,
      image_url: dbData.image_url
    }

    revalidatePath("/admin/images");
    revalidatePath("/admin/products");

    return {
      success: true,
      data: formattedData,
    };

  } catch (error: any) {
    console.error("Error in uploadVariantImage:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred"
    };
  }
}

/**
 * Delete a variant image
 */
export async function deleteVariantImage(imageId: string): Promise<ActionResult> {
  try {
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required"
      };
    }

    // Get image info before deleting
    const { data: image, error: fetchError } = await supabaseAdmin
      .from("variant_images")
      .select("image_url")
      .eq("id", imageId)
      .single();

    if (fetchError || !image) {
      return {
        success: false,
        error: "Image not found"
      };
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin
      .from("variant_images")
      .delete()
      .eq("id", imageId);

    if (dbError) {
      console.error("Database delete error:", dbError);
      return {
        success: false,
        error: "Failed to delete image record"
      };
    }

    // Extract storage path from URL
    const url = new URL(image.image_url);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
    
    if (pathMatch) {
      const storagePath = pathMatch[1];
      
      // Delete from storage (non-critical, continue even if fails)
      const { error: storageError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

      if (storageError) {
        console.warn("Storage delete warning:", storageError);
      }
    }

    revalidatePath("/admin/images");
    revalidatePath("/admin/products");

    return {
      success: true
    };

  } catch (error: any) {
    console.error("Error in deleteVariantImage:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred"
    };
  }
}

/**
 * Update image position
 */
export async function updateImagePosition(
  imageId: string,
  newPosition: ImagePosition
): Promise<ActionResult> {
  try {
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required"
      };
    }

    const { error } = await supabaseAdmin
      .from("variant_images")
      .update({ position: newPosition })
      .eq("id", imageId);

    if (error) {
      console.error("Error updating position:", error);
      return {
        success: false,
        error: "Failed to update position"
      };
    }

    revalidatePath("/admin/images");
    revalidatePath("/admin/products");

    return {
      success: true
    };

  } catch (error: any) {
    console.error("Error in updateImagePosition:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred"
    };
  }
}
