import { ProductFormData, VariantFormData } from '@/types/products/product_form_data'
import { Upload, X } from 'lucide-react'

interface SecondaryImagesSectionProps {
    currentVariant: VariantFormData
    activeVariantIndex: number
    isSubmitting: boolean
    formData: ProductFormData
    setFormData: (data: ProductFormData) => void
}

export const SecondaryImagesSection = ({ 
    currentVariant, 
    activeVariantIndex, 
    isSubmitting,
    formData,
    setFormData
}: SecondaryImagesSectionProps) => {

    const handleSecondaryImagesChange = (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newVariants = [...formData.variants];
    const filesArray = Array.from(files);
    
    // Limit to 10 secondary images per variant
    const limitedFiles = filesArray.slice(0, 10);
    
    newVariants[index] = {
      ...newVariants[index],
      secondary_images: [...newVariants[index].secondary_images, ...limitedFiles]
    };
    
    setFormData({ ...formData, variants: newVariants });
  };

  const removeSecondaryImage = (variantIndex: number, imageIndex: number) => {
    const newVariants = [...formData.variants];
    newVariants[variantIndex].secondary_images = newVariants[variantIndex].secondary_images.filter((_, i) => i !== imageIndex);
    setFormData({ ...formData, variants: newVariants });
  };

  return (
    <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imágenes Adicionales (Opcional)
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Puedes subir hasta 10 imágenes adicionales. También puedes gestionar
            imágenes después desde el panel de administración.
          </p>

          {/* Selected Secondary Images */}
          {currentVariant.secondary_images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {currentVariant.secondary_images.map((file, imageIndex) => (
                <div key={imageIndex} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-100">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Secondary ${imageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      removeSecondaryImage(activeVariantIndex, imageIndex)
                    }
                    className="absolute top-1 right-1 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {file.name}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Upload Input */}
          {currentVariant.secondary_images.length < 10 && (
            <div>
              <input
                type="file"
                id={`secondary-images-${activeVariantIndex}`}
                accept="image/*"
                multiple
                onChange={(e) =>
                  handleSecondaryImagesChange(
                    activeVariantIndex,
                    e.target.files,
                  )
                }
                className="hidden"
                disabled={isSubmitting}
              />
              <label
                htmlFor={`secondary-images-${activeVariantIndex}`}
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">
                  Click para subir imágenes
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG, WEBP, AVIF (Máx 5MB cada una)
                </p>
                <p className="text-xs text-gray-500">
                  {currentVariant.secondary_images.length}/10 imágenes
                </p>
              </label>
            </div>
          )}
        </div>
  )
}
