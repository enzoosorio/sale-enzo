"use server";

import { getAdminUserId } from "@/lib/auth/isAdmin";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";
import { ActionResult } from "@/types/action/action-result";
import { revalidatePath } from "next/cache";

/**
 * Assign uploaded images to a variant after they've been uploaded to storage
 * 
 * This is part of Loop 2 in Model A architecture:
 * - Variants are created first (Loop 1)
 * - Images are uploaded to /variants/{variantId}/
 * - This action updates the variant record with image URLs
 * 
 * @param variantId - The variant UUID
 * @param mainImageUrl - URL of the main image (optional)
 * @param secondaryImages - Array of secondary image URLs with positions
 */
export async function assignVariantImages(
  variantId: string,
  mainImageUrl?: string,
  secondaryImages?: Array<{ image_url: string; position: string | null }>
): Promise<ActionResult> {
  try {
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required"
      };
    }

    // Verify variant exists
    const { data: variant, error: variantError } = await supabaseAdmin
      .from("product_variants")
      .select("id")
      .eq("id", variantId)
      .single();

    if (variantError || !variant) {
      return {
        success: false,
        error: "Variant not found"
      };
    }

    // Update main image URL if provided
    if (mainImageUrl) {
      const { error: updateError } = await supabaseAdmin
        .from("product_variants")
        .update({ main_img_url: mainImageUrl })
        .eq("id", variantId);

      if (updateError) {
        console.error("Error updating main image URL:", updateError);
        return {
          success: false,
          error: "Failed to update main image URL"
        };
      }
    }

    // Insert secondary images if provided
    if (secondaryImages && secondaryImages.length > 0) {
      const imagesToInsert = secondaryImages.map(img => ({
        variant_id: variantId,
        image_url: img.image_url,
        position: img.position || null
      }));

      const { error: imagesError } = await supabaseAdmin
        .from("variant_images")
        .insert(imagesToInsert);

      if (imagesError) {
        console.error("Error inserting secondary images:", imagesError);
        return {
          success: false,
          error: "Failed to insert secondary images"
        };
      }
    }

    revalidatePath("/admin/products");
    revalidatePath("/admin/images");

    return {
      success: true
    };

  } catch (error) {
    console.error("Unexpected error in assignVariantImages:", error);
    return {
      success: false,
      error: "An unexpected error occurred"
    };
  }
}
