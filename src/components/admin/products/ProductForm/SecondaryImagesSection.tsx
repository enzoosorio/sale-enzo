import { ProductFormData, VariantFormData } from '@/types/products/product_form_data'
import { SecondaryImageUI, ImagePosition } from '@/types/products/secondary_image'
import { SecondaryImageCard } from './SecondaryImageCard'
import { Upload } from 'lucide-react'
import { useState, useEffect } from 'react'

interface SecondaryImagesSectionProps {
    currentVariant: VariantFormData
    activeVariantIndex: number
    isSubmitting: boolean
    formData: ProductFormData
    setFormData: (data: ProductFormData) => void
}

const MAX_IMAGES = 10;

export const SecondaryImagesSection = ({ 
    currentVariant, 
    activeVariantIndex, 
    isSubmitting,
    formData,
    setFormData
}: SecondaryImagesSectionProps) => {

    // Local UI state for images with positions
    const [imageUIState, setImageUIState] = useState<SecondaryImageUI[]>([]);

    // Sync UI state with form data when variant changes
    useEffect(() => {
      // Convert File[] to SecondaryImageUI[]
      const uiImages: SecondaryImageUI[] = currentVariant.secondary_images.map((file, idx) => ({
        id: `${activeVariantIndex}-${idx}-${Date.now()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        position: currentVariant.secondary_image_positions?.[idx] || 'random'
      }));
      setImageUIState(uiImages);

      // Cleanup blob URLs on unmount
      return () => {
        uiImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      };
    }, [activeVariantIndex]);

    // Handle bulk or single file upload
    const handleFilesAdd = (files: FileList | null) => {
      if (!files || files.length === 0) return;
      
      const filesArray = Array.from(files);
      const currentCount = imageUIState.length;
      const remainingSlots = MAX_IMAGES - currentCount;
      
      // Check if limit already reached
      if (remainingSlots <= 0) {
        alert('Ya has alcanzado el límite de 10 imágenes para esta variante');
        return;
      }
      
      // Only add files up to the remaining limit
      const filesToAdd = filesArray.slice(0, remainingSlots);
      
      // Create new UI state entries (all start with "random" position)
      const newUIImages: SecondaryImageUI[] = filesToAdd.map((file, idx) => ({
        id: `${activeVariantIndex}-${currentCount + idx}-${Date.now()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        position: 'random' as ImagePosition
      }));

      const updatedUIImages = [...imageUIState, ...newUIImages];
      setImageUIState(updatedUIImages);

      // Sync with form data
      updateFormDataFromUIState(updatedUIImages);
      
      // Notify user if some files were skipped due to limit
      if (filesArray.length > remainingSlots) {
        alert(`Solo se agregaron ${filesToAdd.length} de ${filesArray.length} imágenes para no exceder el límite de ${MAX_IMAGES}`);
      }
    };

    // Update form data from UI state
    const updateFormDataFromUIState = (uiImages: SecondaryImageUI[]) => {
      const newVariants = [...formData.variants];
      newVariants[activeVariantIndex] = {
        ...newVariants[activeVariantIndex],
        secondary_images: uiImages.map(img => img.file),
        secondary_image_positions: uiImages.map(img => img.position)
      };
      setFormData({ ...formData, variants: newVariants });
    };

    // Handle position change for a specific image
    const handlePositionChange = (imageId: string, newPosition: ImagePosition) => {
      const updatedUIImages = imageUIState.map(img =>
        img.id === imageId ? { ...img, position: newPosition } : img
      );
      setImageUIState(updatedUIImages);
      updateFormDataFromUIState(updatedUIImages);
    };

    // Handle image removal
    const handleRemoveImage = (imageId: string) => {
      const imageToRemove = imageUIState.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }
      
      const updatedUIImages = imageUIState.filter(img => img.id !== imageId);
      setImageUIState(updatedUIImages);
      updateFormDataFromUIState(updatedUIImages);
    };

  return (
    <div className="border-t border-gray-200 pt-6">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imágenes Adicionales (Opcional)
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Puedes subir hasta {MAX_IMAGES} imágenes adicionales con posiciones específicas.
        </p>
        <p className="text-xs text-gray-500">
          Selecciona múltiples archivos para carga masiva, o agrega imágenes una por una.
        </p>
      </div>

      {/* Image Grid */}
      {imageUIState.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {imageUIState.map((image) => (
            <SecondaryImageCard
              key={image.id}
              image={image}
              onPositionChange={handlePositionChange}
              onRemove={handleRemoveImage}
              disabled={isSubmitting}
            />
          ))}
        </div>
      )}

      {/* Upload Input */}
      {imageUIState.length < MAX_IMAGES && (
        <div>
          <input
            type="file"
            id={`secondary-images-${activeVariantIndex}`}
            accept="image/*"
            multiple
            onChange={(e) => handleFilesAdd(e.target.files)}
            className="hidden"
            disabled={isSubmitting}
          />
          <label
            htmlFor={`secondary-images-${activeVariantIndex}`}
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-6 h-6 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">
              Click para subir imágenes (múltiples o individuales)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG, WEBP, AVIF (Máx 5MB cada una)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {imageUIState.length}/{MAX_IMAGES} imágenes
            </p>
          </label>
        </div>
      )}

      {/* Info Message */}
      {imageUIState.length === MAX_IMAGES && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            Has alcanzado el límite de {MAX_IMAGES} imágenes para esta variante.
          </p>
        </div>
      )}
    </div>
  )
}
