'use server';
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";
import { ActionResult } from "@/types/action/action-result";
import { ImagePosition } from "@/types/products/variants/variant-images";
import { revalidatePath } from "next/cache";


/**
 * Update image position
 */
export async function updateImagePosition(
  imageId: string,
  position: ImagePosition | null
): Promise<ActionResult> {
  try {
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required"
      };
    }

    // Get the image to find its variant
    const { data: image, error: fetchError } = await supabaseAdmin
      .from("variant_images")
      .select("variant_id")
      .eq("id", imageId)
      .single();

    if (fetchError || !image) {
      return {
        success: false,
        error: "Image not found"
      };
    }

    // If position is a unique type (not "random"), check for conflicts
    if (position && position !== "random") {
      const { data: existingImage } = await supabaseAdmin
        .from("variant_images")
        .select("id")
        .eq("variant_id", image.variant_id)
        .eq("position", position)
        .neq("id", imageId)
        .single();

      if (existingImage) {
        return {
          success: false,
          error: `Another image already uses the "${position}" position`
        };
      }
    }

    // Update the position
    const { error: updateError } = await supabaseAdmin
      .from("variant_images")
      .update({ position: position || null })
      .eq("id", imageId);

    if (updateError) {
      console.error("Error updating position:", updateError);
      return {
        success: false,
        error: "Failed to update image position"
      };
    }

    revalidatePath("/admin/images");

    return {
      success: true
    };

  } catch (error) {
    console.error("Unexpected error in updateImagePosition:", error);
    return {
      success: false,
      error: "An unexpected error occurred"
    };
  }
}