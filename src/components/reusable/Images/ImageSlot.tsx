"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";
import type { ImagePosition } from "@/schema/variantImageSchema";
import { uploadVariantImage } from "@/actions/images/upload";
import { deleteVariantImage } from "@/actions/images/delete";

interface ImageSlotProps {
  position: ImagePosition;
  variantId: string;
  existingImage?: {
    id: string;
    image_url: string;
  } | null;
  allowMultiple?: boolean;
  onUploadSuccess: (imageId: string, imageUrl: string) => void;
  onDeleteSuccess: (imageId: string) => void;
  disabled?: boolean;
}

const positionLabels: Record<ImagePosition, string> = {
  front: "Vista Frontal",
  back: "Vista Trasera",
  logo: "Detalle del Logo",
  detail: "Detalle de Cerca",
  random: "Imágenes Adicionales"
};

const positionDescriptions: Record<ImagePosition, string> = {
  front: "Foto principal del producto de frente",
  back: "Vista posterior del producto",
  logo: "Acercamiento a la marca o logo",
  detail: "Foto de detalle (tela, costura, etc.)",
  random: "Cualquier ángulo o detalle adicional"
};

export function ImageSlot({
  position,
  variantId,
  existingImage,
  allowMultiple = false,
  onUploadSuccess,
  onDeleteSuccess,
  disabled = false
}: ImageSlotProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("variant_id", variantId);
      formData.append("position", position);

      const result = await uploadVariantImage(formData);

      if (!result.success) {
        setError(result.error || "Error al subir la imagen");
        return;
      }

      if(!result.data){
        setError("Error al subir: No se recibió respuesta");
        return;
      }

      onUploadSuccess(result.data.id, result.data.image_url);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (err) {
      console.error("Upload error:", err);
      setError("Ocurrió un error inesperado durante la carga");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingImage || !confirm("¿Está seguro de que desea eliminar esta imagen?")) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      const result = await deleteVariantImage(existingImage.id);
      if (!result.success) {
        setError(result.error || "Error al eliminar");
        return;
      }

      onDeleteSuccess(existingImage.id);

    } catch (err) {
      console.error("Delete error:", err);
      setError("Ocurrió un error inesperado durante la eliminación");
    } finally {
      setIsDeleting(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const hasImage = !!existingImage;
  const isLoading = isUploading || isDeleting;
  const isDisabled = disabled || isLoading;

  return (
    <div className="space-y-2">
      {/* Label */}
      <div>
        <h3 className="text-sm font-medium text-gray-900">
          {positionLabels[position]}
        </h3>
        <p className="text-xs text-gray-500">
          {positionDescriptions[position]}
        </p>
      </div>

      {/* Image Slot */}
      <div 
        className={`
          relative aspect-square w-full rounded-lg border-2 border-dashed
          ${hasImage ? 'border-gray-300' : 'border-gray-300'}
          ${isLoading ? 'opacity-50' : ''}
          overflow-hidden bg-gray-50
        `}
      >
        {/* Existing Image */}
        {hasImage && (
          <>
            <Image
              src={existingImage.image_url}
              alt={`${position} view`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            
            {/* Delete Button */}
            <button
              onClick={handleDelete}
              disabled={isDisabled}
              className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
              aria-label="Eliminar imagen"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
          </>
        )}

        {/* Upload State */}
        {!hasImage && (
          <button
            onClick={triggerFileInput}
            disabled={isDisabled}
            className="absolute inset-0 flex flex-col items-center justify-center p-4 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:hover:bg-gray-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
                <p className="text-sm text-gray-600">Subiendo...</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">Click para subir</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP, AVIF</p>
                <p className="text-xs text-gray-500">Máx 5MB</p>
              </>
            )}
          </button>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isDisabled}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
