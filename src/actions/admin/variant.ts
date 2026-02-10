'use server';

import { getAdminUserId } from "@/lib/auth/isAdmin";
import { CategoryInput, TagInput } from "@/types/products/product_form_data";
import { getOrCreateColorCluster } from "@/utils/colors";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";
import { revalidatePath } from "next/cache";

/**
 * Delete a variant and its associated data
 * Cascade deletes: items, images, tags, colors
 */
export async function deleteVariant(variantId: string) {
  try {
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required"
      };
    }

    // Delete the variant (cascade will handle related tables)
    const { error } = await supabaseAdmin
      .from("product_variants")
      .delete()
      .eq("id", variantId);

    if (error) {
      console.error("Error deleting variant:", error);
      return {
        success: false,
        error: error.message
      };
    }

    revalidatePath("/admin/products");

    return {
      success: true,
      error: null
    };

  } catch (error) {
    console.error("Unexpected error in deleteVariant:", error);
    return {
      success: false,
      error: "An unexpected error occurred"
    };
  }
}

/**
 * Update variant and associated product data
 * Reuses same structure as createProduct but updates existing records
 */
export async function updateVariant(
  variantId: string,
  input: {
    // Product fields
    product_name?: string;
    description?: string;
    brand?: string;
    is_active?: boolean;
    category?: CategoryInput;
    subcategory?: CategoryInput;
    
    // Variant fields
    size?: string;
    gender?: string;
    fit?: string;
    main_color_hex?: string;
    metadata?: Record<string, string>;
    
    // Items (full replacement)
    items?: Array<{
      id?: string; // If present, update; if not, create new
      condition?: string;
      price: number;
      sku?: string;
      stock?: number;
      status?: string;
    }>;
    
    // Tags (full replacement)
    tags?: TagInput[];
  }
) {
  try {
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required"
      };
    }

    // Get existing variant to access product_id
    const { data: existingVariant, error: fetchError } = await supabaseAdmin
      .from("product_variants")
      .select("product_id")
      .eq("id", variantId)
      .single();

    if (fetchError || !existingVariant) {
      return {
        success: false,
        error: "Variant not found"
      };
    }

    // Update product if product fields are provided
    if (input.product_name || input.description !== undefined || input.brand !== undefined || input.is_active !== undefined) {
      const productUpdates: any = {};
      
      if (input.product_name) productUpdates.name = input.product_name;
      if (input.description !== undefined) productUpdates.description = input.description || null;
      if (input.brand !== undefined) productUpdates.brand = input.brand || null;
      if (input.is_active !== undefined) productUpdates.is_active = input.is_active;

      // Handle category updates
      if (input.category || input.subcategory) {
        // Resolve subcategory
        let subcategoryId: string | undefined;
        
        if (input.subcategory) {
          if (input.subcategory.id) {
            subcategoryId = input.subcategory.id;
          } else {
            // Create new subcategory
            const parentId = input.category?.id || null;
            const { data: newSubcat, error: subcatError } = await supabaseAdmin
              .from("product_categories")
              .insert({
                name: input.subcategory.name,
                slug: input.subcategory.slug,
                parent_id: parentId
              })
              .select()
              .single();

            if (subcatError || !newSubcat) {
              return {
                success: false,
                error: `Failed to create subcategory: ${subcatError?.message}`
              };
            }

            subcategoryId = newSubcat.id;
          }
        }

        if (subcategoryId) {
          productUpdates.subcategory_id = subcategoryId;
        }
      }

      const { error: productError } = await supabaseAdmin
        .from("products")
        .update(productUpdates)
        .eq("id", existingVariant.product_id);

      if (productError) {
        console.error("Error updating product:", productError);
        return {
          success: false,
          error: `Failed to update product: ${productError.message}`
        };
      }
    }

    // Update variant if variant fields are provided
    const variantUpdates: any = {};
    
    if (input.size !== undefined) variantUpdates.size = input.size || null;
    if (input.gender !== undefined) variantUpdates.gender = input.gender || null;
    if (input.fit !== undefined) variantUpdates.fit = input.fit || null;
    if (input.metadata !== undefined) variantUpdates.metadata = input.metadata || null;
    
    // Handle color change with clustering
    if (input.main_color_hex) {
      try {
        const colorClusterResult = await getOrCreateColorCluster(input.main_color_hex);
        
        if (!colorClusterResult.color_category_id) {
          throw new Error("Clustering returned invalid result");
        }
        
        variantUpdates.main_color_hex = input.main_color_hex;
        variantUpdates.main_color_category_id = colorClusterResult.color_category_id;
      } catch (colorError: any) {
        return {
          success: false,
          error: `Failed to process color: ${colorError.message}`
        };
      }
    }

    if (Object.keys(variantUpdates).length > 0) {
      const { error: variantError } = await supabaseAdmin
        .from("product_variants")
        .update(variantUpdates)
        .eq("id", variantId);

      if (variantError) {
        console.error("Error updating variant:", variantError);
        return {
          success: false,
          error: `Failed to update variant: ${variantError.message}`
        };
      }
    }

    // Update items (full replacement strategy)
    if (input.items) {
      // Get existing items
      const { data: existingItems } = await supabaseAdmin
        .from("product_items")
        .select("id")
        .eq("variant_id", variantId);

      const existingItemIds = existingItems?.map(i => i.id) || [];
      const inputItemIds = input.items.filter(i => i.id).map(i => i.id!);
      
      // Delete items not in input
      const itemsToDelete = existingItemIds.filter(id => !inputItemIds.includes(id));
      if (itemsToDelete.length > 0) {
        await supabaseAdmin
          .from("product_items")
          .delete()
          .in("id", itemsToDelete);
      }

      // Update or insert items
      for (const item of input.items) {
        if (item.id) {
          // Update existing
          await supabaseAdmin
            .from("product_items")
            .update({
              condition: item.condition || null,
              price: item.price,
              sku: item.sku || null,
              stock: item.stock || 0,
              status: item.status || "available"
            })
            .eq("id", item.id);
        } else {
          // Insert new
          await supabaseAdmin
            .from("product_items")
            .insert({
              variant_id: variantId,
              condition: item.condition || null,
              price: item.price,
              sku: item.sku || null,
              stock: item.stock || 0,
              seller_id: adminUserId,
              status: item.status || "available"
            });
        }
      }
    }

    // Update tags (full replacement)
    if (input.tags) {
      // Delete existing tag relationships
      await supabaseAdmin
        .from("variant_tags")
        .delete()
        .eq("variant_id", variantId);

      // Insert new tags
      const tagsIdsToLink: string[] = [];

      for (const tag of input.tags) {
        if (tag.tagId) {
          tagsIdsToLink.push(tag.tagId);
        } else {
          const { data: newTag, error: createTagError } = await supabaseAdmin
            .from("tags")
            .insert({
              name: tag.name,
              slug: tag.slug
            })
            .select()
            .single();

          if (newTag) {
            tagsIdsToLink.push(newTag.id);
          }
        }
      }

      if (tagsIdsToLink.length > 0) {
        const tagsToInsert = tagsIdsToLink.map(tagId => ({
          variant_id: variantId,
          tag_id: tagId
        }));

        await supabaseAdmin
          .from("variant_tags")
          .insert(tagsToInsert);
      }
    }

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${variantId}`);

    return {
      success: true,
      error: null
    };

  } catch (error) {
    console.error("Unexpected error in updateVariant:", error);
    return {
      success: false,
      error: "An unexpected error occurred"
    };
  }
}

/**
 * Get single variant by ID with all related data
 * Used for detail view and editing
 */
export async function getVariantById(variantId: string) {
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
        *,
        products!inner (
          id,
          name,
          description,
          brand,
          is_active,
          subcategory_id,
          product_categories!inner (
            id,
            name,
            slug,
            parent_id
          )
        ),
        product_items (*),
        variant_images (*),
        variant_tags (
          tag_id,
          tags (*)
        ),
        variant_colors (
          original_hex,
          variant_color_categories (
            id,
            label,
            representative_hex
          )
        )
      `)
      .eq("id", variantId)
      .single();

    if (error) {
      console.error("Error fetching variant:", error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }

    // Get parent category if subcategory exists
    let parentCategory = null;
    if (data.products.product_categories.parent_id) {
      const { data: parentData } = await supabaseAdmin
        .from("product_categories")
        .select("id, name, slug")
        .eq("id", data.products.product_categories.parent_id)
        .single();
      
      parentCategory = parentData;
    }

    return {
      success: true,
      data: {
        variant: data,
        parentCategory
      },
      error: null
    };

  } catch (error) {
    console.error("Unexpected error in getVariantById:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
      data: null
    };
  }
}
