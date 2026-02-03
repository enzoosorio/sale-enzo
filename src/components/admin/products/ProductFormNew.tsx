"use client";

import { useState } from "react";
import { createProduct } from "@/actions/adminProducts";
import { uploadMainVariantImage } from "@/utils/supabase/uploadMainImage";
// import { uploadSecondaryVariantImage } from "@/utils/supabase/uploadSecondaryImage";
import { useRouter } from "next/navigation";
import { ProductFormData } from "@/types/products/product_form_data";
import { ProductSection } from "./ProductForm/ProductSection";
import { VariantsSection } from "./ProductForm/VariantsSection";
import { ActionsSection } from "./ProductForm/ActionsSection";

// ✅ Function that returns a NEW variant object with NEW arrays every time
export const createNewVariant = () => ({
  size: "",
  gender: "",
  fit: "",
  main_img_url: "",
  main_img_file: null,
  main_color_hex: "#000000",
  metadata: {},
  items: [{
    condition: "new",
    price: "",
    sku: "",
    stock: "",
    status: "available"
  }],
  secondary_images: [],
  tag_ids: []
});

// Keep for backward compatibility but use the function instead
export const initialVariant = createNewVariant();

export const initialFormData: ProductFormData = {
  name: "",
  description: "",
  brand: "",
  category_id: "",
  category_name: "",
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

    try {
      // Upload all main images and secondary images first
      const variantsWithImages = await Promise.all(
        formData.variants.map(async (variant, index) => {
          // Upload main image
          let mainImageUrl = variant.main_img_url;
          
          if (variant.main_img_file) {
            setUploadingImages(prev => ({ ...prev, [index]: true }));
            const tempId = `temp-${Date.now()}-${index}`;
            const { url, error: uploadError } = await uploadMainVariantImage(
              variant.main_img_file,
              tempId
            );
            setUploadingImages(prev => ({ ...prev, [index]: false }));

            if (uploadError || !url) {
              throw new Error(`Error subiendo imagen para variante ${index + 1}: ${uploadError}`);
            }

            mainImageUrl = url;
          }

          if (!mainImageUrl) {
            throw new Error(`La variante ${index + 1} requiere una imagen principal`);
          }

          // Upload secondary images if any
          const secondaryImageUrls: Array<{ image_url: string; position: string | null }> = [];
          
          if (variant.secondary_images && variant.secondary_images.length > 0) {
            const tempId = `temp-${Date.now()}-${index}`;
            
            const uploadResults = await Promise.all(
              variant.secondary_images.map(async (file, fileIndex) => {
                const { url, error } = await uploadMainVariantImage(file, tempId);
                if (error || !url) {
                  console.warn(`Warning: Failed to upload secondary image ${fileIndex + 1} for variant ${index + 1}:`, error);
                  return null;
                }
                return { image_url: url, position: null }; // NULL for random/additional images
              })
            );

            // Filter out failed uploads
            secondaryImageUrls.push(...uploadResults.filter((result): result is { image_url: string; position: null } => result !== null));
          }

          return {
            ...variant,
            main_img_url: mainImageUrl,
            main_img_file: undefined,
            secondary_images: undefined,
            images: secondaryImageUrls
          };
        })
      );

      const transformedData = {
        name: formData.name,
        description: formData.description || undefined,
        brand: formData.brand || undefined,
        category_id: formData.category_id,
        is_active: formData.is_active,
        variants: variantsWithImages.map(variant => ({
          size: variant.size || undefined,
          gender: variant.gender || undefined,
          fit: variant.fit || undefined,
          main_img_url: variant.main_img_url,
          main_color_hex: variant.main_color_hex,
          metadata: variant.metadata,
          items: variant.items.map(item => ({
            condition: item.condition || undefined,
            price: parseFloat(item.price) || 0,
            sku: item.sku || undefined,
            stock: parseInt(item.stock) || 0,
            status: item.status || undefined,
          })),
          images: variant.images || [],
          tag_ids: variant.tag_ids.filter(Boolean),
        }))
      };

      const result = await createProduct(transformedData);
      
      if (!result.success) {
        setError(result.error || "Error al crear el producto");
        return;
      }

      alert("¡Producto creado exitosamente!");
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
