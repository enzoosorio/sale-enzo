"use client";

import { useState } from "react";
import { createProduct } from "@/actions/admin/product";
import { uploadMainVariantImage } from "@/utils/supabase/uploadMainImage";
import { uploadSecondaryVariantImage } from "@/utils/supabase/uploadSecondaryImage";
import { assignVariantImages } from "@/actions/images/assignVariantImages";
import { useRouter } from "next/navigation";
import { ProductFormData } from "@/types/products/product_form_data";
import { ProductSection } from "./ProductForm/ProductSection";
import { VariantsSection } from "./ProductForm/VariantsSection";
import { ActionsSection } from "./ProductForm/ActionsSection";
import { VariantMetadataInput } from "@/types/products/product_form_data";

/**
 * Transform metadata inputs into a validated metadata object
 * 
 * RULES:
 * - Remove empty keys or values
 * - Trim whitespace from keys
 * - Normalize keys to lowercase
 * - Handle duplicate keys (last value wins)
 * - Return undefined if no valid entries
 * 
 * @param metadataInputs - Array of key-value pairs from form
 * @returns Metadata object or undefined if empty
 */
function transformMetadataInputs(metadataInputs: VariantMetadataInput[]): Record<string, string> | undefined {
  if (!metadataInputs || metadataInputs.length === 0) {
    return undefined;
  }

  const metadataObject: Record<string, string> = {};

  for (const entry of metadataInputs) {
    const key = entry.key?.trim().toLowerCase();
    const value = entry.value?.trim();

    // Skip empty keys or values
    if (!key || !value) {
      continue;
    }

    // Add to object (duplicates: last value wins)
    metadataObject[key] = value;
  }

  // Return undefined if no valid entries
  if (Object.keys(metadataObject).length === 0) {
    return undefined;
  }

  return metadataObject;
}

// ✅ Function that returns a NEW variant object with NEW arrays every time
export const createNewVariant = () => ({
  size: "",
  gender: "",
  fit: "",
  main_img_url: "",
  main_img_file: null,
  main_color_hex: "#000000",
  metadata: {},
  metadataInputs: [], // Initialize empty metadata inputs
  items: [{
    condition: "new",
    price: "",
    sku: "",
    stock: "",
    status: "available"
  }],
  secondary_images: [],
  secondary_image_positions: [], // Initialize empty positions array
  tags: [], // Start with empty tags array
  secondary_colors: [] // Start with empty secondary colors array
});

// Keep for backward compatibility but use the function instead
export const initialVariant = createNewVariant();

export const initialFormData: ProductFormData = {
  name: "",
  description: "",
  enhanced_description: undefined,
  enhanced_description_en: undefined,
  brand: "",
  category: {
    name: "",
    slug: "",
    id: null
  },
  subcategory: {
    name: "",
    slug: "",
    id: null
  },
  is_active: true,
  variants: [createNewVariant()] // ✅ Use function to get new instance
};

export function ProductForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState<Record<number, boolean>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    console.log("Submitting form with data:");
    console.log({formData});
    
    try {
      // ========================================
      // MODEL A: VARIANT-FIRST ARCHITECTURE
      // ========================================
      // Step 1: Create product structure WITHOUT uploading images
      // Step 2: Server creates variants and returns IDs (Loop 1)
      // Step 3: Upload images using variant IDs (Loop 2 client-side)
      // ========================================

      // Prepare form data for product creation (without image URLs)
      const transformedData = {
        name: formData.name,
        description: formData.description || undefined,
        enhanced_description: formData.enhanced_description, // Pass enhanced description for RAG
        enhanced_description_en: formData.enhanced_description_en, // Pass English version for RAG
        brand: formData.brand || undefined,
        category: formData.category,
        subcategory: formData.subcategory,
        is_active: formData.is_active,
        variants: formData.variants.map(variant => {
          const variantPayload: any = {
            size: variant.size || undefined,
            gender: variant.gender || undefined,
            fit: variant.fit || undefined,
            main_color_hex: variant.main_color_hex,
            items: variant.items.map(item => ({
              condition: item.condition || undefined,
              price: parseFloat(item.price) || 0,
              sku: item.sku || undefined,
              stock: parseInt(item.stock) || 0,
              status: item.status || undefined,
            })),
            images: [], // Will be populated after upload
            tags: variant.tags || [],
            secondary_colors: variant.secondary_colors || [] // Array of HEX color strings
          };

          // Include metadata if present
          const transformedMetadata = transformMetadataInputs(variant.metadataInputs);
          if (transformedMetadata) {
            variantPayload.metadata = transformedMetadata;
          }

          return variantPayload;
        })
      };

      // LOOP 1 (Server): Create product and variants without images
      console.log('📦 Creating product structure...');
      const result = await createProduct(transformedData);
      
      if (!result.success || !result.variantIds) {
        setError(result.error || "Error al crear el producto");
        return;
      }

      console.log(`✅ Product created with ${result.variantIds.length} variants`);

      // LOOP 2 (Client): Upload images using the variant IDs
      console.log('🖼️  Uploading images with variant IDs...');
      const uploadErrors: string[] = [];

      for (let index = 0; index < formData.variants.length; index++) {
        const variant = formData.variants[index];
        const variantId = result.variantIds[index];

        if (!variantId) {
          console.error(`No variant ID for index ${index}`);
          continue;
        }

        setUploadingImages(prev => ({ ...prev, [index]: true }));

        try {
          let mainImageUrl: string | undefined;
          const secondaryImageUrls: Array<{ image_url: string; position: string | null }> = [];

          // Upload main image if present
          if (variant.main_img_file) {
            console.log(`Uploading main image for variant ${index + 1}/${formData.variants.length}`);
            const { url, error: uploadError } = await uploadMainVariantImage(
              variant.main_img_file,
              variantId // Use actual variant ID
            );

            if (uploadError || !url) {
              uploadErrors.push(`Variant ${index + 1} main image: ${uploadError}`);
              console.error(`Failed to upload main image for variant ${index}:`, uploadError);
            } else {
              mainImageUrl = url;
              console.log(`✓ Main image uploaded for variant ${index + 1}`);
            }
          }

          // Upload secondary images if present
          if (variant.secondary_images && variant.secondary_images.length > 0) {
            console.log(`Uploading ${variant.secondary_images.length} secondary images for variant ${index + 1}`);
            
            for (let imgIndex = 0; imgIndex < variant.secondary_images.length; imgIndex++) {
              const file = variant.secondary_images[imgIndex];
              const position = variant.secondary_image_positions?.[imgIndex] || 'random';
              
              const { url, error: uploadError } = await uploadSecondaryVariantImage(
                file,
                variantId,
                imgIndex, // Sequential index for deterministic naming
              );

              if (uploadError || !url) {
                uploadErrors.push(`Variant ${index + 1} secondary image ${imgIndex + 1}: ${uploadError}`);
                console.error(`Failed to upload secondary image ${imgIndex} for variant ${index}:`, uploadError);
              } else {
                secondaryImageUrls.push({ image_url: url, position: position });
                console.log(`✓ Secondary image ${imgIndex + 1}/${variant.secondary_images.length} uploaded (${position})`);
              }
            }
          }

          // Assign uploaded images to the variant in the database
          if (mainImageUrl || secondaryImageUrls.length > 0) {
            const assignResult = await assignVariantImages(
              variantId,
              mainImageUrl,
              secondaryImageUrls.length > 0 ? secondaryImageUrls : undefined
            );

            if (!assignResult.success) {
              uploadErrors.push(`Variant ${index + 1} image assignment: ${assignResult.error}`);
              console.error(`Failed to assign images for variant ${index}:`, assignResult.error);
            } else {
              console.log(`✓ Images assigned to variant ${index + 1}`);
            }
          }
        } catch (uploadError: any) {
          uploadErrors.push(`Variant ${index + 1}: ${uploadError.message}`);
          console.error(`Error uploading images for variant ${index}:`, uploadError);
        } finally {
          setUploadingImages(prev => ({ ...prev, [index]: false }));
        }
      }

      // Report results
      if (uploadErrors.length > 0) {
        console.warn('Some images failed to upload:', uploadErrors);
        alert(`Producto creado exitosamente, pero algunas imágenes fallaron:\n${uploadErrors.join('\n')}`);
      } else {
        console.log('✅ All images uploaded successfully');
        alert("¡Producto creado exitosamente con todas las imágenes!");
      }

      router.push("/admin/products");
      
    } catch (error: any) {
      console.error("Error creating product:", error);
      setError(error.message || "Ocurrió un error inesperado. Por favor intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      <ProductSection
      formData={formData}
      setFormData={setFormData}
      isSubmitting={isSubmitting}
      setError={setError}
      />

      {/* variants section */}
      <VariantsSection
      formData={formData}
      isSubmitting={isSubmitting}
      setError={setError}
      setFormData={setFormData}
      setUploadingImages={setUploadingImages}
      updloadingImages={uploadingImages}
      />

      {/* Actions */}
      <ActionsSection
      isSubmitting={isSubmitting}
      initialFormData={initialFormData}
      setFormData={setFormData}
      />
    </form>
  );
}
