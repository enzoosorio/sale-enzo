'use server';
import { ActionResult } from "@/types/action/action-result";
import { getAdminUserId } from "../../auth/isAdmin";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";


/**
 * Get all additional images for a variant
 */
export async function getVariantImages(variantId: string): Promise<ActionResult<any[]>> {
  try {
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required"
      };
    }

    if(!variantId){
      return {
        success: false,
        error: "Variant ID is required"
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
        error: error.message
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error("Unexpected error in getVariantImages:", error);
    return {
      success: false,
      error: "An unexpected error occurred"
    };
  }
}