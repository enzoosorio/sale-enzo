import { ProductFormData } from "@/types/products/product_form_data";
import { useEffect, useState } from "react";
import { createNewVariant } from "../ProductFormNew";
import { Plus, X } from "lucide-react";
import { ItemsSection } from "./ItemsSection";
import { MainImageMiniSection } from "./MainImageMiniSection";
import { TagSection } from "./TagSection";
import { SecondaryImagesSection } from "./SecondaryImagesSection";

interface VariantsSectionProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  isSubmitting: boolean;
  setError: (error: string) => void;
  updloadingImages: Record<number, boolean>;
  setUploadingImages: (data: Record<number, boolean>) => void;
}

export const VariantsSection = ({
  formData,
  setFormData,
  isSubmitting,
  setError,
  updloadingImages,
  setUploadingImages
}: VariantsSectionProps) => {

  const [activeVariantIndex, setActiveVariantIndex] = useState(0);

  const currentVariant = formData.variants[activeVariantIndex];

  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, createNewVariant()], // ✅ Creates NEW instance with NEW arrays
    });
    setActiveVariantIndex(formData.variants.length);
  };

  const removeVariant = (index: number) => {
    if (formData.variants.length === 1) {
      alert("Debe tener al menos una variante");
      return;
    }
    const newVariants = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: newVariants });
    if (activeVariantIndex >= newVariants.length) {
      setActiveVariantIndex(newVariants.length - 1);
    }
  };

  const updateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-prata font-semibold text-gray-900">
          Variantes
        </h2>
        <button
          type="button"
          onClick={addVariant}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar Variante
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {formData.variants.map((variant, index) => (
          <div key={index} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveVariantIndex(index)}
              className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                  ${
                    activeVariantIndex === index
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                `}
            >
              Variante {index + 1}
              {variant.size && ` (${variant.size})`}
            </button>
            {formData.variants.length > 1 && (
              <button
                type="button"
                onClick={() => removeVariant(index)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Eliminar variante"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-6 border-t border-gray-200 pt-6">
        <h3 className="font-medium text-gray-900">Detalles de la Variante</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Talla
            </label>
            <input
              type="text"
              value={currentVariant.size}
              onChange={(e) =>
                updateVariant(activeVariantIndex, "size", e.target.value)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="ej: M, L, XL"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Género
            </label>
            <select
              value={currentVariant.gender}
              onChange={(e) =>
                updateVariant(activeVariantIndex, "gender", e.target.value)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Seleccionar género</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ajuste
            </label>
            <select
              value={currentVariant.fit}
              onChange={(e) =>
                updateVariant(activeVariantIndex, "fit", e.target.value)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Seleccionar ajuste</option>
              <option value="regular">Regular</option>
              <option value="slim">Slim</option>
              <option value="relaxed">Holgado</option>
              <option value="oversized">Oversized</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Principal (Hex)
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={currentVariant.main_color_hex}
                onChange={(e) =>
                  updateVariant(
                    activeVariantIndex,
                    "main_color_hex",
                    e.target.value,
                  )
                }
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={currentVariant.main_color_hex}
                onChange={(e) =>
                  updateVariant(
                    activeVariantIndex,
                    "main_color_hex",
                    e.target.value,
                  )
                }
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="#000000"
              />
            </div>
          </div>
          <MainImageMiniSection
            activeVariantIndex={activeVariantIndex}
            currentVariant={currentVariant}
            formData={formData}
            setFormData={setFormData}
            setUploadingImages={setUploadingImages}
            uploadingImages={updloadingImages}
          />
        </div>

        {/* Items Inventory */}
        <ItemsSection
          currentVariant={currentVariant}
          formData={formData}
          setFormData={setFormData}
          activeVariantIndex={activeVariantIndex}
        />

        {/* Tags */}
        <TagSection
          activeVariantIndex={activeVariantIndex}
          currentVariant={currentVariant}
          isSubmitting={isSubmitting}
          updateVariant={updateVariant}
          setError={setError}
        />

        {/* Secondary Images */}
        <SecondaryImagesSection
        activeVariantIndex={activeVariantIndex}
        currentVariant={currentVariant}
        formData={formData}
        isSubmitting={isSubmitting}
        setFormData={setFormData}
        />
      </div>
    </section>
  );
};
