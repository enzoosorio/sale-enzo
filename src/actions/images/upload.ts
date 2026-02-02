'use server';
import { ActionResult } from "@/types/action/action-result";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { ImagePosition, variantImageInsertSchema } from "@/schema";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";
import { 
    deleteVariantImageFromStorage,
  uploadVariantImage as uploadToStorage, 
} from "@/utils/supabase/storage";
import { revalidatePath } from "next/cache";

/**
 * Upload and create a variant image
 * Handles both storage upload and database insertion
 */
export async function uploadVariantImage(
  formData: FormData
): Promise<ActionResult<{ id: string; image_url: string }>> {
  try {
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required"
      };
    }

    // Extract form data
    const file = formData.get("file") as File;
    const variantId = formData.get("variant_id") as string;
    const position = formData.get("position") as ImagePosition | null;

    if (!file || !variantId) {
      return {
        success: false,
        error: "Missing required fields: file and variant_id"
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

    // If position is provided, check if it's a unique position (not "random")
    if (position && position !== "random") {
      // Check if an image with this position already exists
      const { data: existingImage } = await supabaseAdmin
        .from("variant_images")
        .select("id")
        .eq("variant_id", variantId)
        .eq("position", position)
        .single();

      if (existingImage) {
        return {
          success: false,
          error: `An image with position "${position}" already exists for this variant. Only one image per position is allowed (except "random").`
        };
      }
    }

    // Generate a unique ID for the image
    const imageId = crypto.randomUUID();

    // Upload to storage
    const { url, error: uploadError } = await uploadToStorage(
      file,
      variantId,
      imageId
    );

    if (uploadError || !url) {
      return {
        success: false,
        error: uploadError || "Failed to upload image"
      };
    }

    // Validate with schema
    const validationResult = variantImageInsertSchema.safeParse({
      variant_id: variantId,
      image_url: url,
      position: position || null
    });

    if (!validationResult.success) {
      // Clean up uploaded file
      await deleteVariantImageFromStorage(url);
      
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "Validation failed"
      };
    }

    // Insert into database
    const { data: imageRecord, error: dbError } = await supabaseAdmin
      .from("variant_images")
      .insert({
        id: imageId,
        variant_id: variantId,
        image_url: url,
        position: position || null
      })
      .select()
      .single();

    if (dbError || !imageRecord) {
      // Clean up uploaded file
      await deleteVariantImageFromStorage(url);
      
      console.error("Database insertion error:", dbError);
      return {
        success: false,
        error: "Failed to save image record to database"
      };
    }

    revalidatePath("/admin/images");

    return {
      success: true,
      data: {
        id: imageRecord.id,
        image_url: imageRecord.image_url
      }
    };

  } catch (error) {
    console.error("Unexpected error in uploadVariantImage:", error);
    return {
      success: false,
      error: "An unexpected error occurred during upload"
    };
  }
}