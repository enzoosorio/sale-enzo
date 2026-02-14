"use client";

import { useState } from "react";
import { 
  getSubcategoryImages, 
  uploadSubcategoryImages, 
  deleteSubcategoryImage 
} from "@/actions/subcategoryImages";

interface SubcategoryImage {
  id: string;
  subcategory_id: string;
  image_url: string;
  created_at: string;
}

interface SubcategoryImageManagerProps {
  subcategoryId: string | null;
  subcategoryName: string | null;
}

export function SubcategoryImageManager({ 
  subcategoryId, 
  subcategoryName 
}: SubcategoryImageManagerProps) {
  const [images, setImages] = useState<SubcategoryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const MAX_IMAGES = 6;

  const handleLoadImages = async () => {
    if (!subcategoryId) {
      setError("Primero selecciona una subcategoría");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const result = await getSubcategoryImages(subcategoryId);

    if (result.success && result.data) {
      setImages(result.data);
      setHasLoaded(true);
      if (result.data.length === 0) {
        setSuccess("Esta subcategoría no tiene imágenes todavía.");
      } else {
        setSuccess(`${result.data.length} imagen(es) cargada(s)`);
      }
    } else {
      setError(result.error || "Error al cargar imágenes");
    }

    setIsLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!subcategoryId) {
      setError("Primero selecciona una subcategoría");
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (images.length + files.length > MAX_IMAGES) {
      setError(`Máximo ${MAX_IMAGES} imágenes permitidas. Actualmente tienes ${images.length}.`);
      e.target.value = ""; // Reset input
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    Array.from(files).forEach((file, index) => {
      formData.append(`file-${index}`, file);
    });

    const result = await uploadSubcategoryImages(subcategoryId, formData);

    if (result.success && result.data) {
      setImages(prev => [...prev, ...result.data!]);
      setSuccess(`${result.data.length} imagen(es) subida(s) exitosamente`);
      e.target.value = ""; // Reset input
    } else {
      setError(result.error || "Error al subir imágenes");
    }

    setIsUploading(false);
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta imagen?")) return;

    setError(null);
    setSuccess(null);

    const result = await deleteSubcategoryImage(imageId);

    if (result.success) {
      setImages(prev => prev.filter(img => img.id !== imageId));
      setSuccess("Imagen eliminada exitosamente");
    } else {
      setError(result.error || "Error al eliminar imagen");
    }
  };

  const isDisabled = !subcategoryId || !subcategoryName;
  const canUploadMore = images.length < MAX_IMAGES;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-prata font-bold text-gray-900 mb-2">
          Gestión de Imágenes para Hover UI
        </h2>
        <p className="text-sm text-gray-600">
          {subcategoryName 
            ? `Subcategoría: ${subcategoryName}` 
            : "Selecciona una subcategoría para gestionar sus imágenes"}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Estas imágenes se muestran en el efecto hover del menú público (máximo {MAX_IMAGES} imágenes)
        </p>
      </div>

      {/* Load Images Button */}
      {!hasLoaded && (
        <button
          onClick={handleLoadImages}
          disabled={isDisabled || isLoading}
          className="w-full mb-4 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Cargando..." : "Cargar Imágenes de Subcategoría"}
        </button>
      )}

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Image Gallery */}
      {hasLoaded && (
        <>
          {images.length > 0 ? (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  Imágenes ({images.length}/{MAX_IMAGES})
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image) => (
                  <div 
                    key={image.id} 
                    className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200"
                  >
                    <img
                      src={image.image_url}
                      alt="Subcategory preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                      <button
                        onClick={() => handleDelete(image.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6 p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <p className="text-gray-500">
                Esta subcategoría no tiene imágenes todavía.
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Sube imágenes para que aparezcan en el efecto hover del menú
              </p>
            </div>
          )}

          {/* Upload Section */}
          {canUploadMore && (
            <div className="border-t pt-4">
              <label className="block">
                <span className="sr-only">Subir imágenes</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUpload}
                  disabled={isUploading || isDisabled}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-gray-900 file:text-white
                    hover:file:bg-gray-800
                    file:cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </label>
              <p className="mt-2 text-xs text-gray-500">
                Puedes subir {MAX_IMAGES - images.length} imagen(es) más. Selecciona múltiples archivos para subir en lote.
              </p>
              {isUploading && (
                <div className="mt-2 flex items-center text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                  Subiendo imágenes...
                </div>
              )}
            </div>
          )}

          {/* Reload button when images are loaded */}
          <button
            onClick={handleLoadImages}
            disabled={isDisabled || isLoading}
            className="mt-4 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isLoading ? "Recargando..." : "Recargar Imágenes"}
          </button>
        </>
      )}
    </div>
  );
}
