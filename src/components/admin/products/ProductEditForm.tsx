"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateVariant } from "@/actions/admin/variant";
import { ProductSection } from "@/components/admin/products/ProductForm/ProductSection";
import { CategoryInput, SubcategoryInput, TagInput } from "@/types/products/product_form_data";

interface ProductEditFormProps {
  variantId: string;
  variantData: any;
  parentCategory: any;
}

interface EditFormData {
  // Product fields
  product_name: string;
  description: string;
  brand: string;
  is_active: boolean;
  category: CategoryInput;
  subcategory: SubcategoryInput;
  
  // Variant fields
  size: string;
  gender: string;
  fit: string;
  main_color_hex: string;
  metadata: Record<string, string>;
  
  // Items
  items: Array<{
    id?: string;
    condition: string;
    price: string;
    sku: string;
    stock: string;
    status: string;
  }>;
  
  // Tags
  tags: TagInput[];
}

/**
 * ProductEditForm Component
 * 
 * Form for updating an existing variant
 * Reuses ProductSection but with simplified variant/items handling
 */
export function ProductEditForm({ variantId, variantData, parentCategory }: ProductEditFormProps) {
  const router = useRouter();
  const variant = variantData;
  const product = variant.products;
  const subcategory = product.product_categories;

  // Transform variant data into form state
  const initialData: EditFormData = {
    product_name: product.name || "",
    description: product.description || "",
    brand: product.brand || "",
    is_active: product.is_active ?? true,
    category: {
      name: parentCategory?.name || "",
      slug: parentCategory?.slug || "",
      id: parentCategory?.id || null
    },
    subcategory: {
      name: subcategory.name || "",
      slug: subcategory.slug || "",
      id: subcategory.id || null
    },
    size: variant.size || "",
    gender: variant.gender || "",
    fit: variant.fit || "",
    main_color_hex: variant.main_color_hex || "#000000",
    metadata: variant.metadata || {},
    items: variant.product_items?.map((item: any) => ({
      id: item.id,
      condition: item.condition || "new",
      price: item.price?.toString() || "",
      sku: item.sku || "",
      stock: item.stock?.toString() || "",
      status: item.status || "available"
    })) || [],
    tags: variant.variant_tags?.map((vt: any) => ({
      name: vt.tags.name,
      slug: vt.tags.slug,
      tagId: vt.tags.id
    })) || []
  };

  const [formData, setFormData] = useState<EditFormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateVariant(variantId, {
        product_name: formData.product_name,
        description: formData.description,
        brand: formData.brand,
        is_active: formData.is_active,
        category: formData.category,
        subcategory: formData.subcategory,
        size: formData.size,
        gender: formData.gender,
        fit: formData.fit,
        main_color_hex: formData.main_color_hex,
        metadata: formData.metadata,
        items: formData.items.map(item => ({
          id: item.id,
          condition: item.condition,
          price: parseFloat(item.price) || 0,
          sku: item.sku,
          stock: parseInt(item.stock) || 0,
          status: item.status
        })),
        tags: formData.tags
      });

      if (!result.success) {
        setError(result.error || "Error updating variant");
        return;
      }

      // Redirect to variant detail page
      router.push(`/admin/products/${variantId}`);
      router.refresh();

    } catch (error: any) {
      console.error("Error updating variant:", error);
      setError(error.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          condition: "new",
          price: "",
          sku: "",
          stock: "",
          status: "available"
        }
      ]
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length === 1) {
      alert("Variant must have at least one item");
      return;
    }
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Product Information Section - Reuse existing component */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-prata font-semibold mb-4 text-gray-900">
          Product Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
              disabled={isSubmitting}
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Product Active
            </label>
          </div>
        </div>
      </section>

      {/* Variant Details Section */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-prata font-semibold mb-4 text-gray-900">
          Variant Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Size
            </label>
            <input
              type="text"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="e.g., M, L, XL"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              disabled={isSubmitting}
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fit
            </label>
            <select
              value={formData.fit}
              onChange={(e) => setFormData({ ...formData, fit: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              disabled={isSubmitting}
            >
              <option value="">Select</option>
              <option value="slim">Slim</option>
              <option value="regular">Regular</option>
              <option value="relaxed">Relaxed</option>
              <option value="oversized">Oversized</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.main_color_hex}
                onChange={(e) => setFormData({ ...formData, main_color_hex: e.target.value })}
                className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                disabled={isSubmitting}
              />
              <input
                type="text"
                value={formData.main_color_hex}
                onChange={(e) => setFormData({ ...formData, main_color_hex: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono"
                placeholder="#000000"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Items Section */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-prata font-semibold text-gray-900">
            Inventory Items
          </h2>
          <button
            type="button"
            onClick={addItem}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            + Add Item
          </button>
        </div>

        <div className="space-y-3">
          {formData.items.map((item, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Item {index + 1}
                </span>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-700 text-sm"
                    disabled={isSubmitting}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Condition
                  </label>
                  <select
                    value={item.condition}
                    onChange={(e) => updateItem(index, 'condition', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    disabled={isSubmitting}
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={item.price}
                    onChange={(e) => updateItem(index, 'price', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="0.00"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={item.sku}
                    onChange={(e) => updateItem(index, 'sku', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="SKU-123"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    value={item.stock}
                    onChange={(e) => updateItem(index, 'stock', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="0"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Status
                  </label>
                  <select
                    value={item.status}
                    onChange={(e) => updateItem(index, 'status', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    disabled={isSubmitting}
                  >
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
