"use server";

import { supabaseAdmin } from "@/utils/supabase/supabase-admin";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { revalidatePath } from "next/cache";
import { TagInput, CategoryInput, SubcategoryInput } from "@/types/products/product_form_data";
import { getOrCreateColorCluster, processSecondaryColors } from "@/utils/colors/clustering";
import { generateRagForProduct, linkVariantTags, resolveTagIds } from "@/lib/catalog/productWrites";

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
  enhanced_description?: string; // User-triggered enhanced description (for RAG only, not persisted in DB)
  enhanced_description_en?: string; // Short English semantic version (for RAG only)
  brand?: string;
  category: CategoryInput;
  subcategory: SubcategoryInput;
  is_active: boolean;

  // Strict mode for bulk imports
  // When true: ANY error (including tags) causes complete rollback
  // When false: Tags are optional, continue on tag errors (default for manual creation)
  strictMode?: boolean;

  // Skip RAG generation (for synthetic/test data)
  // When true: Skips expensive OpenAI embedding generation
  // When false: Generates embeddings for production data (default)
  skipRAG?: boolean;

  // Variants with nested items and images
  variants: Array<{
    size?: string;
    gender?: string;
    fit?: string;
    // NOTE: main_img_url is optional
    // - If provided (bulk import with external URLs): Use directly
    // - If not provided (manual product creation): Images uploaded CLIENT-SIDE after variant creation
    main_img_url?: string;
    main_color_hex: string;
    metadata?: Record<string, string>; // Optional metadata for semantic search enrichment
    
    items: Array<{
      condition?: string;
      price: number;
      sku?: string;
      stock?: number;
      status?: string;
    }>;

    // NOTE: images array is NOT used anymore
    // Secondary images are uploaded CLIENT-SIDE after variant creation
    images?: Array<{
      image_url: string;
      position: string | number | null;
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
 variantIds?: string[]; // Array of created variant IDs for image uploads
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
      // Check if category already exists by slug
      const { data: existingCategory } = await supabaseAdmin
        .from("product_categories")
        .select("id")
        .eq("slug", input.category.slug)
        .is("parent_id", null) // Ensure it's a root category
        .single();

      if (existingCategory) {
        // Use existing category
        categoryId = existingCategory.id;
      } else {
        // Category doesn't exist - create it
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
    }

    // Step 2: Resolve subcategory
    let subcategoryId: string;

    if (input.subcategory.id) {
      // Subcategory exists - use the ID directly
      subcategoryId = input.subcategory.id;
    } else {
      // Check if subcategory already exists by slug
      const { data: existingSubcategory } = await supabaseAdmin
        .from("product_categories")
        .select("id")
        .eq("slug", input.subcategory.slug)
        .eq("parent_id", categoryId) // Must match parent category
        .single();

      if (existingSubcategory) {
        // Use existing subcategory
        subcategoryId = existingSubcategory.id;
      } else {
        // Subcategory doesn't exist - create it with parent_id = categoryId
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

    // Map to store variant IDs for Loop 2
    const variantIdMap: Map<number, string> = new Map();

    // ========================================
    // LOOP 1: VARIANT CREATION PHASE
    // ========================================
    // Purpose: Establish structural layer - create all variants WITHOUT images
    // Images are NOT uploaded here - variant IDs must exist first
    // ========================================
    console.log('📦 Loop 1: Creating variant structure...');
    
    for (let variantIndex = 0; variantIndex < input.variants.length; variantIndex++) {
      const variantInput = input.variants[variantIndex];
      // ========================================
      // COLOR CLUSTERING PIPELINE
      // ========================================
      // Process main color through clustering system
      // This MUST happen before variant creation
      let colorClusterResult;
      
      try {
        colorClusterResult = await getOrCreateColorCluster(variantInput.main_color_hex);
        
        // Guard: Validate cluster result has required fields
        if (!colorClusterResult.color_category_id) {
          throw new Error(`Clustering returned invalid result: missing color_category_id`);
        }
        
        console.log(`✓ Color clustering for variant: ${JSON.stringify({
          hex: variantInput.main_color_hex,
          cluster_id: colorClusterResult.color_category_id,
          is_new: colorClusterResult.is_new_cluster
        })}`);
      } catch (colorError: any) {
        console.error("❌ Color clustering failed:", colorError);
        // Rollback: delete the product
        await supabaseAdmin.from("products").delete().eq("id", product.id);
        return {
          success: false,
          error: `Failed to process color for variant: ${colorError.message}`
        };
      }

      // Create variant WITH color cluster assignment
      // NOTE: main_img_url handling:
      // - If provided in input (e.g., bulk import): Use it directly
      // - If not provided: Set to empty string for client-side upload
      const { data: variant, error: variantError } = await supabaseAdmin
        .from("product_variants")
        .insert({
          product_id: product.id,
          size: variantInput.size || null,
          gender: variantInput.gender || null,
          fit: variantInput.fit || null,
          main_img_url: variantInput.main_img_url || "", // Use provided URL or empty for upload
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

      // Store variant ID for Loop 2 (image assignment phase)
      variantIdMap.set(variantIndex, variant.id);
      console.log(`✓ Created variant ${variantIndex + 1}: ${variant.id}`);

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

      // NOTE: Image creation moved to Loop 2
      // Images are uploaded and assigned AFTER all variants exist

      // ========================================
      // SECONDARY COLORS CLUSTERING
      // ========================================
      // Process secondary colors (if provided) through clustering pipeline
      // These could come from image analysis or manual input
      // ⚠️ BLOCKS variant creation on failure for data integrity
      if (variantInput.secondary_colors && variantInput.secondary_colors.length > 0) {
        try {
          await processSecondaryColors(variant.id, variantInput.secondary_colors);
          console.log(`✓ Processed ${variantInput.secondary_colors.length} secondary colors for variant ${variant.id}`);
        } catch (secondaryColorError: any) {
          console.error("❌ Secondary color processing failed:", secondaryColorError);
          // Rollback: delete the product (cascade will handle variants)
          await supabaseAdmin.from("products").delete().eq("id", product.id);
          return {
            success: false,
            error: `Failed to process secondary colors: ${secondaryColorError.message}`
          };
        }
      }

      // Tags: resolve/create ids, then link to the variant
      try {
        const tagIds = await resolveTagIds(variantInput.tags ?? [], input.strictMode);
        await linkVariantTags(variant.id, tagIds);
      } catch (tagError: any) {
        console.error("Error processing variant tags:", tagError);
        // Strict mode (bulk imports): rollback. Manual creation continues without tags.
        if (input.strictMode) {
          await supabaseAdmin.from("products").delete().eq("id", product.id);
          return { success: false, error: tagError.message };
        }
        console.warn("⚠️ Continuing without tags (non-strict mode)");
      }
    }

    console.log(`✅ Loop 1 complete: Created ${variantIdMap.size} variants`);
    console.log(`📤 Returning variant IDs to client for image upload...`);

    // ========================================
    // NOTE: Image upload happens CLIENT-SIDE
    // ========================================
    // The client will:
    // 1. Receive variantIds[] from this response
    // 2. Upload images to /variants/{variantId}/main/ and /secondary/
    // 3. Call assignVariantImages() to update the database
    //
    // This ensures:
    // - Deterministic storage paths using real variant IDs
    // - No temporary folders
    // - Clean separation of concerns
    // ========================================

    // ========================================
    // RAG GENERATION PIPELINE
    // ========================================
    // Generate semantic profiles for all product items
    // This runs AFTER all product data is complete
    // SKIP if this is test/synthetic data (saves OpenAI API costs)
    if (input.skipRAG) {
      console.log('⏭️  Skipping RAG generation (test data mode)');
    } else {
      console.log('🚀 Starting RAG generation for all product items...');
    }
    
    if (!input.skipRAG) {
      await generateRagForProduct(product.id, {
        enhanced_description: input.enhanced_description,
        enhanced_description_en: input.enhanced_description_en,
      });
    }

    // Revalidate the products page
    revalidatePath("/admin/products");

    // Return product ID and variant IDs for client-side image uploads
    return {
      success: true,
      productId: product.id,
      variantIds: Array.from(variantIdMap.values()), // Return ordered array of variant IDs
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

/**
 * Get product variants with pagination and search
 * Primary entity is VARIANT, joined with product data
 * 
 * @param search - Search term for product name
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 */
export async function getProductVariants(
  search?: string,
  page: number = 1,
  limit: number = 10
) {
  try {
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
        data: null,
        total: 0
      };
    }

    const offset = (page - 1) * limit;

    // Build base query
    let query = supabaseAdmin
      .from("product_variants")
      .select(`
        id,
        main_img_url,
        size,
        gender,
        fit,
        main_color_hex,
        created_at,
        products!product_variants_product_id_fkey!inner (
          id,
          name,
          brand
        ),
        product_items (
          stock,
          status
        )
      `, { count: 'exact' });

    // Apply search filter on product name
    if (search && search.trim()) {
      query = query.ilike('products.name', `%${search.trim()}%`);
    }

    // Apply ordering and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching variants:", error);
      return {
        success: false,
        error: error.message,
        data: null,
        total: 0
      };
    }

    // Transform data to include availability and fix products type
    const transformedData = data?.map((variant: any) => ({
      id: variant.id,
      main_img_url: variant.main_img_url,
      size: variant.size,
      gender: variant.gender,
      fit: variant.fit,
      main_color_hex: variant.main_color_hex,
      created_at: variant.created_at,
      products: Array.isArray(variant.products) ? variant.products[0] : variant.products,
      availability: variant.product_items?.some((item: any) => 
        (item.stock || 0) > 0 && item.status === 'available'
      ) || false
    })) || [];

    return {
      success: true,
      data: transformedData,
      total: count || 0,
      error: null
    };

  } catch (error) {
    console.error("Unexpected error in getProductVariants:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
      data: null,
      total: 0
    };
  }
}

