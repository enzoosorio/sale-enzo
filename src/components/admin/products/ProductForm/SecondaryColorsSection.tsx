import { VariantFormData } from '@/types/products/product_form_data'
import { Plus, X } from 'lucide-react'
import React from 'react'

interface SecondaryColorsSectionProps {
  currentVariant: VariantFormData
  updateVariant: (variantIndex: number, field: string, value: any) => void
  isSubmitting: boolean
  activeVariantIndex: number
}

export const SecondaryColorsSection = ({
  currentVariant,
  updateVariant,
  isSubmitting,
  activeVariantIndex
}: SecondaryColorsSectionProps) => {
  
  const secondaryColors = currentVariant.secondary_colors || [];

  const handleAddColor = () => {
    const newColors = [...secondaryColors, '#000000'];
    updateVariant(activeVariantIndex, 'secondary_colors', newColors);
  };

  const handleColorChange = (index: number, newColor: string) => {
    const newColors = [...secondaryColors];
    newColors[index] = newColor;
    updateVariant(activeVariantIndex, 'secondary_colors', newColors);
  };

  const handleRemoveColor = (index: number) => {
    const newColors = secondaryColors.filter((_, i) => i !== index);
    updateVariant(activeVariantIndex, 'secondary_colors', newColors);
  };

  return (
    <div className="border-t border-gray-200 pt-6 ">
      <div className="flex items-center justify-between mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Colores Secundarios
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Agrega colores adicionales que aparecen en la variante
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddColor}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Agregar Color
        </button>
      </div>

      {secondaryColors.length > 0 ? (
        <div className="space-y-3">
          {secondaryColors.map((color, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              {/* Color Picker */}
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                  disabled={isSubmitting}
                  className="w-12 h-12 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed"
                  title="Seleccionar color"
                />
                
                {/* HEX Input */}
                <input
                  type="text"
                  value={color}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm uppercase"
                  placeholder="#000000"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  maxLength={7}
                />
              </div>

              {/* Preview */}
              <div
                className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm"
                style={{ backgroundColor: color }}
                title={`Vista previa: ${color}`}
              />

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemoveColor(index)}
                disabled={isSubmitting}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Eliminar color"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
          No se han agregado colores secundarios. Haz clic en "Agregar Color" para comenzar.
        </div>
      )}
    </div>
  );
};
