'use server';
import { ActionResult } from "@/types/action/action-result";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";

/**
 * Get variant information including main image and product details
 */
export async function getVariantInfo(variantId: string): Promise<ActionResult<{
  variant: any;
  product: any;
  additionalImagesCount: number;
}>> {
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(variantId)) {
      return {
        success: false,
        error: "Invalid variant ID format"
      };
    }

    // Fetch variant with product info
    const { data: variant, error: variantError } = await supabaseAdmin
      .from("product_variants")
      .select(`
        *,
        products (
          id,
          name,
          brand,
          description,
          product_categories (
            name,
            slug
          )
        )
      `)
      .eq("id", variantId)
      .single();

    if (variantError || !variant) {
      return {
        success: false,
        error: "Variant not found"
      };
    }

    // Count additional images
    const { count, error: countError } = await supabaseAdmin
      .from("variant_images")
      .select("*", { count: "exact", head: true })
      .eq("variant_id", variantId);

    if (countError) {
      console.error("Error counting images:", countError);
    }

    return {
      success: true,
      data: {
        variant,
        product: variant.products,
        additionalImagesCount: count || 0
      }
    };

  } catch (error) {
    console.error("Unexpected error in getVariantInfo:", error);
    return {
      success: false,
      error: "An unexpected error occurred"
    };
  }
}