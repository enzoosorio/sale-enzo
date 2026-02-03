import { ProductFormData, VariantFormData } from '@/types/products/product_form_data'
import { Upload, X } from 'lucide-react'
import Image from 'next/image'
import React, { useState } from 'react'

interface MainImageMiniSectionProps {
    currentVariant: VariantFormData
    formData: ProductFormData
    setFormData: (data: ProductFormData) => void
    activeVariantIndex: number
    uploadingImages: Record<number, boolean>
    setUploadingImages: (data: Record<number, boolean>) => void
}

export const MainImageMiniSection = ({ currentVariant, formData, setFormData, activeVariantIndex, uploadingImages, setUploadingImages }: MainImageMiniSectionProps) => {

    const handleMainImageChange = (index: number, file: File | null) => {
    if (!file) return;
    const newVariants = [...formData.variants];
    newVariants[index] = {
      ...newVariants[index],
      main_img_file: file,
      main_img_url: URL.createObjectURL(file)
    };
    setFormData({ ...formData, variants: newVariants });
  };

  const removeMainImage = (index: number) => {
    const newVariants = [...formData.variants];
    if (newVariants[index].main_img_url.startsWith('blob:')) {
      URL.revokeObjectURL(newVariants[index].main_img_url);
    }
    newVariants[index] = {
      ...newVariants[index],
      main_img_file: null,
      main_img_url: ""
    };
    setFormData({ ...formData, variants: newVariants });
  };
  

    return (
    <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagen Principal * 
                <span className="text-xs font-normal text-gray-500 ml-2">(Imágenes adicionales se gestionan después de crear el producto)</span>
              </label>
              
              {currentVariant.main_img_url ? (
                <div className="relative">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-300">
                    <Image
                      src={currentVariant.main_img_url}
                      alt="Vista previa"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMainImage(activeVariantIndex)}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    id={`main-image-${activeVariantIndex}`}
                    accept="image/*"
                    onChange={(e) => handleMainImageChange(activeVariantIndex, e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label
                    htmlFor={`main-image-${activeVariantIndex}`}
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {uploadingImages[activeVariantIndex] ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
                        <p className="text-sm text-gray-600">Subiendo...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 font-medium">Click para subir imagen</p>
                        <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP, AVIF (Máx 5MB)</p>
                      </>
                    )}
                  </label>
                </div>
              )}
            </div>
  )
}
