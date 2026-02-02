'use server';
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { ActionResult } from "@/types/action/action-result";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";
import { deleteVariantImageFromStorage } from "@/utils/supabase/storage";
import { revalidatePath } from "next/cache";

/**
 * Delete a variant image
 * IMPORTANT: Deletes from storage FIRST, then from database
 */
export async function deleteVariantImage(imageId: string): Promise<ActionResult> {
  try {
    const adminUserId = await getAdminUserId();
    
    if(!imageId){
      return {
        success: false,
        error: "Image ID is required"
      };
    }

    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required"
      };
    }

    // Get the image record to retrieve the URL
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

    // Step 1: Delete from storage FIRST
    const { success: storageSuccess, error: storageError } = 
      await deleteVariantImageFromStorage(image.image_url);

    if (!storageSuccess) {
      return {
        success: false,
        error: `Failed to delete image from storage: ${storageError}`
      };
    }

    // Step 2: Delete from database
    const { error: dbError } = await supabaseAdmin
      .from("variant_images")
      .delete()
      .eq("id", imageId);

    if (dbError) {
      console.error("Database deletion error:", dbError);
      return {
        success: false,
        error: "Image was deleted from storage but failed to delete database record. Please contact support."
      };
    }

    revalidatePath("/admin/images");

    return {
      success: true
    };

  } catch (error) {
    console.error("Unexpected error in deleteVariantImage:", error);
    return {
      success: false,
      error: "An unexpected error occurred during deletion"
    };
  }
}