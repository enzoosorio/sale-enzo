"use server";

import { supabaseAdmin } from "@/utils/supabase/supabase-admin";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { revalidatePath } from "next/cache";
import { TagInput, CategoryInput, SubcategoryInput } from "@/types/products/product_form_data";
import { getOrCreateColorCluster, processSecondaryColors } from "@/utils/colors/clustering";
import { generateProductRAG, type ProductItemData } from "@/lib/rag/productRag";

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
  category: CategoryInput;
  subcategory: SubcategoryInput;
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

    tags: TagInput[];
    
    // Optional: Secondary colors extracted from image analysis
    secondary_colors?: string[]; // Array of HEX color strings
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
    if (!input.name) {
      return {
        success: false,
        error: "Missing required field: name"
      };
    }

    if (!input.category?.name || !input.subcategory?.name) {
      return {
        success: false,
        error: "Missing required fields: category and subcategory"
      };
    }

    if (!input.variants || input.variants.length === 0) {
      return {
        success: false,
        error: "At least one variant is required"
      };
    }

    // Step 1: Resolve category
    let categoryId: string;

    if (input.category.id) {
      // Category exists - use the ID directly
      categoryId = input.category.id;
    } else {
      // Category is new - create it
      const { data: newCategory, error: categoryError } = await supabaseAdmin
        .from("product_categories")
        .insert({
          name: input.category.name,
          slug: input.category.slug,
          parent_id: null // Root category
        })
        .select()
        .single();

      if (categoryError || !newCategory) {
        console.error("Error creating category:", categoryError);
        return {
          success: false,
          error: `Failed to create category: ${categoryError?.message || "Unknown error"}`
        };
      }

      categoryId = newCategory.id;
    }

    // Step 2: Resolve subcategory
    let subcategoryId: string;

    if (input.subcategory.id) {
      // Subcategory exists - use the ID directly
      subcategoryId = input.subcategory.id;
    } else {
      // Subcategory is new - create it with parent_id = categoryId
      const { data: newSubcategory, error: subcategoryError } = await supabaseAdmin
        .from("product_categories")
        .insert({
          name: input.subcategory.name,
          slug: input.subcategory.slug,
          parent_id: categoryId // Link to parent category
        })
        .select()
        .single();

      if (subcategoryError || !newSubcategory) {
        console.error("Error creating subcategory:", subcategoryError);
        return {
          success: false,
          error: `Failed to create subcategory: ${subcategoryError?.message || "Unknown error"}`
        };
      }

      subcategoryId = newSubcategory.id;
    }

    // Step 3: Create the product
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .insert({
        name: input.name,
        description: input.description || null,
        brand: input.brand || null,
        subcategory_id: subcategoryId, // Always points to subcategory
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
      // ========================================
      // COLOR CLUSTERING PIPELINE
      // ========================================
      // Process main color through clustering system
      // This MUST happen before variant creation
      let colorClusterResult;
      
      try {
        colorClusterResult = await getOrCreateColorCluster(variantInput.main_color_hex);
        console.log(`Color clustering for variant: ${JSON.stringify({
          hex: variantInput.main_color_hex,
          cluster_id: colorClusterResult.color_category_id,
          is_new: colorClusterResult.is_new_cluster
        })}`);
      } catch (colorError: any) {
        console.error("Color clustering failed:", colorError);
        // Rollback: delete the product
        await supabaseAdmin.from("products").delete().eq("id", product.id);
        return {
          success: false,
          error: `Failed to process color for variant: ${colorError.message}`
        };
      }

      // Create variant WITH color cluster assignment
      const { data: variant, error: variantError } = await supabaseAdmin
        .from("product_variants")
        .insert({
          product_id: product.id,
          size: variantInput.size || null,
          gender: variantInput.gender || null,
          fit: variantInput.fit || null,
          main_img_url: variantInput.main_img_url,
          main_color_hex: variantInput.main_color_hex,
          main_color_category_id: colorClusterResult.color_category_id, // ✅ Cluster assignment
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

      // ========================================
      // SECONDARY COLORS CLUSTERING
      // ========================================
      // Process secondary colors (if provided) through clustering pipeline
      // These could come from image analysis or manual input
      if (variantInput.secondary_colors && variantInput.secondary_colors.length > 0) {
        try {
          await processSecondaryColors(variant.id, variantInput.secondary_colors);
          console.log(`Processed ${variantInput.secondary_colors.length} secondary colors for variant ${variant.id}`);
        } catch (secondaryColorError: any) {
          console.error("Secondary color processing failed:", secondaryColorError);
          // Don't block product creation for secondary colors
          // Log and continue
        }
      }

      const tagsIdsToLink: string[] = [];

      // Process tags based on tagId presence
      if (variantInput.tags && variantInput.tags.length > 0) {
        for (const tag of variantInput.tags) {
          if (tag.tagId) {
            // Tag already exists - use the ID directly (no DB query needed)
            tagsIdsToLink.push(tag.tagId);
          } else {
            // Tag is new - create it
            const { data: newTag, error: createTagError } = await supabaseAdmin
              .from("tags")
              .insert({
                name: tag.name,
                slug: tag.slug
              })
              .select()
              .single();

            if (createTagError) {
              console.error("Error creating new tag:", createTagError);
              continue; // Skip this tag on error
            }

            if (newTag) {
              tagsIdsToLink.push(newTag.id);
            }
          }
        }
      }

      // Create variant-tag relationships
      if (tagsIdsToLink.length > 0) {
        const tagsToInsert = tagsIdsToLink.map(tagId => ({
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

    // ========================================
    // RAG GENERATION PIPELINE
    // ========================================
    // Generate semantic profiles for all product items
    // This runs AFTER all product data is complete
    console.log('🚀 Starting RAG generation for all product items...');
    
    try {
      // Query all items with their complete related data
      const { data: itemsWithData, error: queryError } = await supabaseAdmin
        .from('product_items')
        .select(`
          id,
          condition,
          price,
          stock,
          status,
          product_variants!inner (
            id,
            size,
            gender,
            fit,
            main_color_hex,
            main_color_category_id,
            product_id,
            products!inner (
              id,
              name,
              description,
              brand,
              subcategory_id,
              product_categories!inner (
                id,
                name,
                slug,
                parent_id
              )
            ),
            variant_color_categories (
              name
            ),
            variant_tags (
              tags (
                name
              )
            )
          )
        `)
        .eq('product_variants.product_id', product.id);

      if (queryError) {
        console.error('Error querying items for RAG generation:', queryError);
        // Don't block product creation if RAG query fails
      } else if (itemsWithData && itemsWithData.length > 0) {
        // Get category and subcategory info
        const { data: categoryData } = await supabaseAdmin
          .from('product_categories')
          .select('id, name')
          .eq('id', categoryId)
          .single();

        const { data: subcategoryData } = await supabaseAdmin
          .from('product_categories')
          .select('id, name')
          .eq('id', subcategoryId)
          .single();

        // Generate RAG for each item
        const ragPromises = itemsWithData.map(async (item: any) => {
          try {
            const variant = item.product_variants;
            const product = variant.products;
            
            // Extract tags from the nested structure
            const tags = variant.variant_tags?.map((vt: any) => vt.tags?.name).filter(Boolean) || [];
            
            // Get color category name
            const colorCategoryName = variant.variant_color_categories?.name || undefined;
            
            // Prepare data for RAG generation
            const ragData: ProductItemData = {
              product_item_id: item.id,
              
              // Product fields
              product_name: product.name,
              product_description: product.description || undefined,
              product_brand: product.brand || undefined,
              
              // Category fields
              category_name: categoryData?.name || 'Unknown',
              subcategory_name: subcategoryData?.name || 'Unknown',
              
              // Variant fields
              variant_size: variant.size || undefined,
              variant_gender: variant.gender || undefined,
              variant_fit: variant.fit || undefined,
              variant_main_color_hex: variant.main_color_hex,
              
              // Color category
              color_category_name: colorCategoryName,
              
              // Item fields
              item_condition: item.condition || undefined,
              item_price: item.price,
              item_stock: item.stock || 0,
              item_status: item.status || undefined,
              
              // Tags
              tags: tags
            };
            
            // Generate RAG profile
            const result = await generateProductRAG(ragData);
            
            if (!result.success) {
              console.error(`Failed to generate RAG for item ${item.id}:`, result.error);
            }
            
            return result;
          } catch (itemError) {
            console.error(`Error processing RAG for item ${item.id}:`, itemError);
            return { success: false, error: 'Processing error' };
          }
        });

        // Wait for all RAG generations to complete
        const ragResults = await Promise.allSettled(ragPromises);
        
        const successCount = ragResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failCount = ragResults.length - successCount;
        
        console.log(`✅ RAG generation complete: ${successCount} succeeded, ${failCount} failed`);
      }
    } catch (ragError) {
      console.error('RAG generation pipeline error:', ragError);
      // Don't block product creation if RAG fails
      // Product is still created successfully, RAG can be regenerated later
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
