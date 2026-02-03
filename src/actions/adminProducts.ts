"use server";

import { supabaseAdmin } from "@/utils/supabase/supabase-admin";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { revalidatePath } from "next/cache";

/**
 * Admin server action to create a complete product with variants, items, and images.
 * 
 * Security:
 * - Uses supabaseAdmin (service_role) because admin operations bypass RLS
 * - Validates admin status via getAdminUserId() before any database operations
 * - This is the safest approach for admin-only CRUD where RLS doesn't apply
 * 
 * Note: supabaseAdmin is appropriate here because:
 * 1. We explicitly verify admin status first
 * 2. Product creation requires writing to multiple tables atomically
 * 3. RLS policies may not allow the complex relationships needed
 * 4. Admin operations should work regardless of RLS configuration
 */

interface CreateProductInput {
  // Product data
  name: string;
  description?: string;
  brand?: string;
  category_id: string;
  is_active: boolean;

  // Variants with nested items and images
  variants: Array<{
    size?: string;
    gender?: string;
    fit?: string;
    main_img_url: string;
    main_color_hex: string;
    metadata?: Record<string, any>;
    
    items: Array<{
      condition?: string;
      price: number;
      sku?: string;
      stock?: number;
      status?: string;
    }>;

    images: Array<{
      image_url: string;
      position: string | number | null; // Accept string enum, number (legacy), or null
    }>;

    tag_ids: string[];
  }>;
}

interface ActionResult {
  success: boolean;
  error?: string;
  productId?: string;
}

export async function createProduct(input: CreateProductInput): Promise<ActionResult> {
  try {
    // CRITICAL: Verify admin status first
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required"
      };
    }

    // Validate required fields
    if (!input.name || !input.category_id) {
      return {
        success: false,
        error: "Missing required fields: name and category_id"
      };
    }

    if (!input.variants || input.variants.length === 0) {
      return {
        success: false,
        error: "At least one variant is required"
      };
    }

    // Step 1: Create the product
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .insert({
        name: input.name,
        description: input.description || null,
        brand: input.brand || null,
        category_id: input.category_id,
        is_active: input.is_active,
      })
      .select()
      .single();

    if (productError || !product) {
      console.error("Error creating product:", productError);
      return {
        success: false,
        error: `Failed to create product: ${productError?.message || "Unknown error"}`
      };
    }

    // Step 2: Create variants and their related data
    for (const variantInput of input.variants) {
      // Create variant
      const { data: variant, error: variantError } = await supabaseAdmin
        .from("product_variants")
        .insert({
          product_id: product.id,
          size: variantInput.size || null,
          gender: variantInput.gender || null,
          fit: variantInput.fit || null,
          main_img_url: variantInput.main_img_url,
          main_color_hex: variantInput.main_color_hex,
          metadata: variantInput.metadata || null,
        })
        .select()
        .single();

      if (variantError || !variant) {
        console.error("Error creating variant:", variantError);
        // Rollback: delete the product (cascade will handle variants)
        await supabaseAdmin.from("products").delete().eq("id", product.id);
        return {
          success: false,
          error: `Failed to create variant: ${variantError?.message || "Unknown error"}`
        };
      }

      // Create product items for this variant
      if (variantInput.items && variantInput.items.length > 0) {
        const itemsToInsert = variantInput.items.map(item => ({
          variant_id: variant.id,
          condition: item.condition,
          price: item.price,
          sku: item.sku || null,
          stock: item.stock || 0,
          seller_id: adminUserId, // Admin is the seller
          status: item.status || "available",
        }));

        const { error: itemsError } = await supabaseAdmin
          .from("product_items")
          .insert(itemsToInsert);

        if (itemsError) {
          console.error("Error creating items:", itemsError);
          await supabaseAdmin.from("products").delete().eq("id", product.id);
          return {
            success: false,
            error: `Failed to create items: ${itemsError.message}`
          };
        }
      }

      // Create additional images for this variant
      if (variantInput.images && variantInput.images.length > 0) {
        const imagesToInsert = variantInput.images.map(img => ({
          variant_id: variant.id,
          image_url: img.image_url,
          position: img.position,
        }));

        const { error: imagesError } = await supabaseAdmin
          .from("variant_images")
          .insert(imagesToInsert);

        if (imagesError) {
          console.error("Error creating images:", imagesError);
          // Continue anyway - images are not critical
        }
      }

      // Create variant-tag relationships
      if (variantInput.tag_ids && variantInput.tag_ids.length > 0) {
        const tagsToInsert = variantInput.tag_ids.map(tagId => ({
          variant_id: variant.id,
          tag_id: tagId,
        }));

        const { error: tagsError } = await supabaseAdmin
          .from("variant_tags")
          .insert(tagsToInsert);

        if (tagsError) {
          console.error("Error creating variant tags:", tagsError);
          // Continue anyway - tags are not critical
        }
      }
    }

    // Revalidate the products page
    revalidatePath("/admin/products");

    return {
      success: true,
      productId: product.id,
    };

  } catch (error) {
    console.error("Unexpected error in createProduct:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again."
    };
  }
}

/**
 * Get all products with basic info (for admin list view)
 */
export async function getProducts() {
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
      .from("products")
      .select(`
        id,
        name,
        brand,
        is_active,
        created_at,
        product_categories(name, slug)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    return {
      success: true,
      data,
      error: null
    };

  } catch (error) {
    console.error("Unexpected error in getProducts:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
      data: null
    };
  }
}

/**
 * Get product by ID with all related data
 */
export async function getProductById(productId: string) {
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
      .from("products")
      .select(`
        *,
        product_categories(name, slug),
        product_variants(
          *,
          product_items(*),
          variant_images(*),
          variant_tags(
            tag_id,
            tags(*)
          )
        )
      `)
      .eq("id", productId)
      .single();

    if (error) {
      console.error("Error fetching product:", error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    return {
      success: true,
      data,
      error: null
    };

  } catch (error) {
    console.error("Unexpected error in getProductById:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
      data: null
    };
  }
}
