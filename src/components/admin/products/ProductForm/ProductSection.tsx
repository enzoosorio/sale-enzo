import { BrandSelector } from "@/components/reusable/CTA/Combobox/BrandSelector"
import { CategoryCombobox } from "@/components/reusable/CTA/Combobox/CategoryCombobox"
import { SubcategoryCombobox } from "@/components/reusable/CTA/Combobox/SubcategoryCombobox"
import { ProductFormData, CategoryInput, SubcategoryInput } from "@/types/products/product_form_data"
import { enhanceDescription } from "@/actions/ai/enhance-description"
import { useState } from "react"
import { Sparkles, X } from "lucide-react"

interface ProductSectionProps {
  formData: ProductFormData
  setFormData: (data: ProductFormData) => void
  isSubmitting: boolean
  setError: (error: string) => void
}

export const ProductSection = ({ formData, setFormData, isSubmitting, setError }: ProductSectionProps) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const handleCategoryChange = (category: CategoryInput) => {
    setFormData({ 
      ...formData, 
      category,
      // Reset subcategory when category changes
      subcategory: {
        name: "",
        slug: "",
        id: null
      }
    });
  };

  const handleSubcategoryChange = (subcategory: SubcategoryInput) => {
    setFormData({ 
      ...formData, 
      subcategory
    });
  };

  const handleEnhanceDescription = async () => {
    if (!formData.description || formData.description.trim() === "") {
      setError("Debe escribir una descripción antes de mejorarla");
      return;
    }

    setIsEnhancing(true);
    setError("");

    try {
      const result = await enhanceDescription({
        description: formData.description,
        language: "es"
      });

      if (!result.success) {
        setError(result.error || "Error al mejorar la descripción");
        return;
      }

      setFormData({
        ...formData,
        enhanced_description: result.enhanced_description,
        enhanced_description_en: result.enhanced_description_en
      });

    } catch (error) {
      console.error("Error enhancing description:", error);
      setError("Error inesperado al mejorar la descripción");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleDiscardEnhanced = () => {
    setFormData({
      ...formData,
      enhanced_description: undefined,
      enhanced_description_en: undefined
    });
  };
  
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-prata font-semibold mb-4 text-gray-900">
          Información del Producto
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Producto *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="ej: Camiseta de Algodón Clásica"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Describa su producto..."
            />
            
            {/* Enhancement button */}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleEnhanceDescription}
                disabled={isEnhancing || isSubmitting || !formData.description || formData.description.trim() === ""}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                {isEnhancing ? "Mejorando..." : "Mejorar descripción con IA"}
              </button>
              {formData.enhanced_description && (
                <span className="text-xs text-green-600 font-medium">
                  ✓ Descripción mejorada disponible
                </span>
              )}
            </div>
          </div>

          {/* Enhanced description (shown only when available) */}
          {formData.enhanced_description && (
            <div className="md:col-span-2 bg-linear-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-purple-900">
                  Descripción Mejorada (usada para búsqueda semántica)
                </label>
                <button
                  type="button"
                  onClick={handleDiscardEnhanced}
                  className="text-xs text-gray-600 hover:text-red-600 flex items-center gap-1 transition-colors"
                  title="Descartar descripción mejorada"
                >
                  <X className="w-3 h-3" />
                  Descartar
                </button>
              </div>
              <textarea
                value={formData.enhanced_description}
                onChange={(e) => setFormData({ ...formData, enhanced_description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-white"
                placeholder="Descripción mejorada..."
              />
              {formData.enhanced_description_en && (
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <label className="block text-xs font-medium text-purple-800 mb-1">
                    Versión corta en inglés (para búsqueda multilingüe):
                  </label>
                  <p className="text-xs text-gray-700 bg-white px-3 py-2 rounded border border-purple-200">
                    {formData.enhanced_description_en}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Marca
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="ej: Nike"
            />
          </div> */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Marca *
            </label>
              <BrandSelector
              value={formData.brand}
              onChange={(brand) => setFormData({ ...formData, brand })}
              onError={(error) => setError(error)}
              disabled={isSubmitting}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría *
            </label>
            <CategoryCombobox
              value={formData.category}
              onChange={handleCategoryChange}
              onError={(error) => setError(error)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subcategoría *
            </label>
            <SubcategoryCombobox
              value={formData.subcategory}
              parentCategory={formData.category}
              onChange={handleSubcategoryChange}
              onError={(error) => setError(error)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Producto Activo
            </label>
          </div>
        </div>
      </section>
  )
}
