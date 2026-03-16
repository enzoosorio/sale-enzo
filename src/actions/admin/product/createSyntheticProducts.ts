"use server";

import { createProduct } from "../product";
import { getAdminUserId } from "@/lib/auth/isAdmin";
import { BulkProductInput, BulkImportResult } from "@/types/products/bulk_import";
import { supabaseAdmin } from "@/utils/supabase/supabase-admin";

/**
 * Bulk product creation for synthetic data import
 * 
 * This action accepts an array of product objects and creates them
 * by calling createProduct() for each one.
 * 
 * CRITICAL VALIDATION RULES:
 * - All required fields must exist for each product
 * - If ANY field validation fails, the ENTIRE product is rejected
 * - No partial inserts - it's all or nothing per product
 * - Successful products are retained even if others fail
 * 
 * DUPLICATE PREVENTION:
 * - Checks for existing products by name + brand before creation
 * - Checks for existing variants by product_id + size + gender + color
 * - Skips duplicates with descriptive warning message
 * 
 * TESTING MODE:
 * - Skips expensive RAG/embedding generation (skipRAG: true)
 * - Only performs color clustering (required for product structure)
 * 
 * Security: Validates admin status before processing
 * 
 * @param products - Array of product objects to import
 * @returns Result with success count, failure count, and errors
 */

/**
 * Check if a product already exists in the database
 * Matches by: name + brand (case-insensitive)
 * 
 * @param name - Product name
 * @param brand - Product brand
 * @returns Product ID if exists, null otherwise
 */
async function checkProductExists(name: string, brand?: string): Promise<string | null> {
  const query = supabaseAdmin
    .from("products")
    .select("id")
    .ilike("name", name);

  if (brand) {
    query.ilike("brand", brand);
  } else {
    query.is("brand", null);
  }

  const { data } = await query.maybeSingle();
  return data?.id || null;
}

/**
 * Check if a variant already exists for a product
 * Matches by: product_id + size + gender + main_color_hex
 * 
 * @param productId - Product ID to check
 * @param size - Variant size
 * @param gender - Variant gender
 * @param colorHex - Main color hex
 * @returns Variant ID if exists, null otherwise
 */
async function checkVariantExists(
  productId: string,
  size: string,
  gender: string,
  colorHex: string
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("size", size)
    .eq("gender", gender)
    .eq("main_color_hex", colorHex)
    .maybeSingle();

  return data?.id || null;
}

/**
 * Validates that a product has ALL required fields populated
 * This ensures no partial data enters the database
 * 
 * @param product - Product to validate
 * @param index - Product index for error messages
 * @throws Error with descriptive message if validation fails
 */
function validateProductCompleteness(product: BulkProductInput, index: number): void {
  // Product-level required fields
  if (!product.name || product.name.trim() === "") {
    throw new Error(`Product #${index + 1}: 'name' is required and cannot be empty`);
  }

  if (!product.description || product.description.trim() === "") {
    throw new Error(`Product #${index + 1}: 'description' is required and cannot be empty`);
  }

  if (!product.brand || product.brand.trim() === "") {
    throw new Error(`Product #${index + 1}: 'brand' is required and cannot be empty`);
  }

  // Category validation
  if (!product.category) {
    throw new Error(`Product #${index + 1}: 'category' object is required`);
  }

  if (!product.category.name || product.category.name.trim() === "") {
    throw new Error(`Product #${index + 1}: 'category.name' is required and cannot be empty`);
  }

  if (!product.category.slug || product.category.slug.trim() === "") {
    throw new Error(`Product #${index + 1}: 'category.slug' is required and cannot be empty`);
  }

  // Subcategory validation
  if (!product.subcategory) {
    throw new Error(`Product #${index + 1}: 'subcategory' object is required`);
  }

  if (!product.subcategory.name || product.subcategory.name.trim() === "") {
    throw new Error(`Product #${index + 1}: 'subcategory.name' is required and cannot be empty`);
  }

  if (!product.subcategory.slug || product.subcategory.slug.trim() === "") {
    throw new Error(`Product #${index + 1}: 'subcategory.slug' is required and cannot be empty`);
  }

  // is_active validation (boolean, cannot be undefined)
  if (typeof product.is_active !== "boolean") {
    throw new Error(`Product #${index + 1}: 'is_active' must be a boolean (true/false)`);
  }

  // Variants array validation
  if (!product.variants || !Array.isArray(product.variants)) {
    throw new Error(`Product #${index + 1}: 'variants' must be an array`);
  }

  if (product.variants.length === 0) {
    throw new Error(`Product #${index + 1}: 'variants' array cannot be empty`);
  }

  if (product.variants.length !== 1) {
    throw new Error(`Product #${index + 1}: Must contain exactly 1 variant (found ${product.variants.length})`);
  }

  const variant = product.variants[0];

  // Variant-level required fields
  if (!variant.size || variant.size.trim() === "") {
    throw new Error(`Product #${index + 1}: 'variant.size' is required and cannot be empty`);
  }

  if (!variant.gender || variant.gender.trim() === "") {
    throw new Error(`Product #${index + 1}: 'variant.gender' is required and cannot be empty`);
  }

  if (!variant.fit || variant.fit.trim() === "") {
    throw new Error(`Product #${index + 1}: 'variant.fit' is required and cannot be empty`);
  }

  if (!variant.main_img_url || variant.main_img_url.trim() === "") {
    throw new Error(`Product #${index + 1}: 'variant.main_img_url' is required and cannot be empty`);
  }

  // Validate main_img_url is a valid URL
  try {
    new URL(variant.main_img_url);
  } catch {
    throw new Error(`Product #${index + 1}: 'variant.main_img_url' must be a valid URL`);
  }

  if (!variant.main_color_hex || variant.main_color_hex.trim() === "") {
    throw new Error(`Product #${index + 1}: 'variant.main_color_hex' is required and cannot be empty`);
  }

  // Validate hex color format
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexPattern.test(variant.main_color_hex)) {
    throw new Error(`Product #${index + 1}: 'variant.main_color_hex' must be a valid hex color (e.g., #000000)`);
  }

  // Metadata validation
  if (!variant.metadata || typeof variant.metadata !== "object") {
    throw new Error(`Product #${index + 1}: 'variant.metadata' must be an object`);
  }

  if (Object.keys(variant.metadata).length === 0) {
    throw new Error(`Product #${index + 1}: 'variant.metadata' cannot be empty (must have at least 1 property)`);
  }

  // Tags validation
  if (!variant.tags || !Array.isArray(variant.tags)) {
    throw new Error(`Product #${index + 1}: 'variant.tags' must be an array`);
  }

  if (variant.tags.length === 0) {
    throw new Error(`Product #${index + 1}: 'variant.tags' array cannot be empty (must have at least 1 tag)`);
  }

  // Validate each tag
  variant.tags.forEach((tag, tagIndex) => {
    if (!tag.name || tag.name.trim() === "") {
      throw new Error(`Product #${index + 1}: Tag #${tagIndex + 1} 'name' is required`);
    }
    if (!tag.slug || tag.slug.trim() === "") {
      throw new Error(`Product #${index + 1}: Tag #${tagIndex + 1} 'slug' is required`);
    }
  });

  // Secondary colors validation
  if (!variant.secondary_colors || !Array.isArray(variant.secondary_colors)) {
    throw new Error(`Product #${index + 1}: 'variant.secondary_colors' must be an array`);
  }

  if (variant.secondary_colors.length === 0) {
    throw new Error(`Product #${index + 1}: 'variant.secondary_colors' array cannot be empty (must have at least 1 color)`);
  }

  // Validate each secondary color format
  variant.secondary_colors.forEach((color, colorIndex) => {
    if (!hexPattern.test(color)) {
      throw new Error(`Product #${index + 1}: Secondary color #${colorIndex + 1} must be a valid hex color`);
    }
  });

  // Items array validation
  if (!variant.items || !Array.isArray(variant.items)) {
    throw new Error(`Product #${index + 1}: 'variant.items' must be an array`);
  }

  if (variant.items.length === 0) {
    throw new Error(`Product #${index + 1}: 'variant.items' array cannot be empty`);
  }

  if (variant.items.length !== 1) {
    throw new Error(`Product #${index + 1}: Must contain exactly 1 item (found ${variant.items.length})`);
  }

  const item = variant.items[0];

  // Item-level required fields
  if (!item.condition || item.condition.trim() === "") {
    throw new Error(`Product #${index + 1}: 'item.condition' is required and cannot be empty`);
  }

  // Validate condition is one of the allowed values
  const ALLOWED_CONDITIONS = ['new', 'used'];
  if (!ALLOWED_CONDITIONS.includes(item.condition.toLowerCase())) {
    throw new Error(
      `Product #${index + 1}: 'item.condition' must be one of: ${ALLOWED_CONDITIONS.join(', ')} (got '${item.condition}')`
    );
  }

  if (typeof item.price !== "number" || item.price < 0) {
    throw new Error(`Product #${index + 1}: 'item.price' must be a positive number`);
  }

  if (!item.sku || item.sku.trim() === "") {
    throw new Error(`Product #${index + 1}: 'item.sku' is required and cannot be empty`);
  }

  if (typeof item.stock !== "number" || item.stock < 0) {
    throw new Error(`Product #${index + 1}: 'item.stock' must be a non-negative number`);
  }

  if (!item.status || item.status.trim() === "") {
    throw new Error(`Product #${index + 1}: 'item.status' is required and cannot be empty`);
  }
}
export async function createSyntheticProducts(
  products: BulkProductInput[]
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    success: false,
    inserted: 0,
    failed: 0,
    errors: [],
  };

  try {
    // CRITICAL: Verify admin status first
    const adminUserId = await getAdminUserId();
    
    if (!adminUserId) {
      return {
        success: false,
        inserted: 0,
        failed: 0,
        errors: [{ productName: "Authorization", error: "Unauthorized: Admin access required" }],
      };
    }

    // Validate input
    if (!Array.isArray(products) || products.length === 0) {
      return {
        success: false,
        inserted: 0,
        failed: 0,
        errors: [{ productName: "Validation", error: "Products array is empty or invalid" }],
      };
    }

    console.log(`🚀 Starting bulk import for ${products.length} products...`);

    // Process each product sequentially
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      try {
        console.log(`📦 Processing product ${i + 1}/${products.length}: ${product.name || `Product #${i + 1}`}`);

        // ========================================
        // VALIDATION PHASE
        // ========================================
        // Validate ALL required fields before attempting database operations
        // If any validation fails, the entire product is rejected
        // This ensures no partial data enters the database
        try {
          validateProductCompleteness(product, i);
          console.log(`✓ Validation passed for product ${i + 1}`);
        } catch (validationError) {
          throw validationError; // Re-throw to be caught by outer try-catch
        }

        // ========================================
        // DATABASE INSERTION PHASE
        // ========================================
        // All validations passed - proceed with product creation
        // If createProduct() fails at ANY point, it will rollback the entire product
        // This includes: product, variants, items, colors, tags, etc.
        
        const variant = product.variants[0];

        // ========================================
        // DUPLICATE CHECK PHASE
        // ========================================
        // Check if product already exists (by name + brand)
        const existingProductId = await checkProductExists(product.name, product.brand);
        
        if (existingProductId) {
          // Product exists - check if variant is also duplicate
          const existingVariantId = await checkVariantExists(
            existingProductId,
            variant.size || '',
            variant.gender || '',
            variant.main_color_hex
          );

          if (existingVariantId) {
            // Complete duplicate - skip this product
            console.log(`⏭️  Skipping product ${i + 1}: Already exists (Product: ${existingProductId}, Variant: ${existingVariantId})`);
            result.failed++;
            result.errors?.push({
              productName: product.name,
              error: `Duplicate: Product "${product.name}" with size "${variant.size}", gender "${variant.gender}", and color "${variant.main_color_hex}" already exists`
            });
            continue; // Skip to next product
          } else {
            // Product exists but variant is new
            // This is currently not supported in bulk import (1 product = 1 variant constraint)
            console.log(`⚠️  Warning: Product "${product.name}" exists but with different variant`);
            result.failed++;
            result.errors?.push({
              productName: product.name,
              error: `Product "${product.name}" already exists. Bulk import does not support adding variants to existing products.`
            });
            continue; // Skip to next product
          }
        }

        // ========================================
        // PRODUCT CREATION PHASE
        // ========================================
        // No duplicates found - proceed with creation

        // Transform to CreateProductInput format
        const productInput = {
          name: product.name,
          description: product.description,
          brand: product.brand,
          category: {
            name: product.category.name,
            slug: product.category.slug,
            id: product.category.id || null,
          },
          subcategory: {
            name: product.subcategory.name,
            slug: product.subcategory.slug,
            id: product.subcategory.id || null,
          },
          is_active: product.is_active,
          strictMode: true, // CRITICAL: Enable strict mode for bulk imports
          skipRAG: true, // CRITICAL: Skip RAG generation for test/synthetic data (saves OpenAI costs)
          variants: [{
            size: variant.size,
            gender: variant.gender,
            fit: variant.fit,
            main_img_url: variant.main_img_url,
            main_color_hex: variant.main_color_hex,
            metadata: variant.metadata,
            tags: variant.tags || [], // Ensure tags is always an array
            secondary_colors: variant.secondary_colors || [], // Ensure secondary_colors is always an array
            items: variant.items.map(item => ({
              condition: item.condition,
              price: item.price,
              sku: item.sku,
              stock: item.stock,
              status: item.status,
            })),
          }],
        };

        // Call createProduct() with validated data
        // NOTE: createProduct() has internal rollback mechanisms
        // If ANY step fails (product, variant, items, colors), it will:
        // 1. Delete the product (cascade deletes variants, items, etc.)
        // 2. Return success: false with error message
        const createResult = await createProduct(productInput);

        if (!createResult.success) {
          throw new Error(createResult.error || "Failed to create product");
        }

        result.inserted++;
        console.log(`✅ Product ${i + 1}/${products.length} created successfully`);

      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        result.errors?.push({
          productName: product.name || `Product #${i + 1}`,
          error: errorMessage,
        });
        console.error(`❌ Failed to create product ${i + 1}:`, errorMessage);
        // Continue with next product - this product is completely rejected
      }
    }

    // Determine overall success
    result.success = result.inserted > 0;

    console.log(`\n📊 Bulk import completed:`);
    console.log(`   ✅ Inserted: ${result.inserted}`);
    console.log(`   ❌ Failed: ${result.failed}`);

    return result;

  } catch (error) {
    console.error("Fatal error in createSyntheticProducts:", error);
    return {
      success: false,
      inserted: result.inserted,
      failed: products.length - result.inserted,
      errors: [
        ...(result.errors || []),
        {
          productName: "System Error",
          error: error instanceof Error ? error.message : "An unexpected error occurred",
        },
      ],
    };
  }
}
