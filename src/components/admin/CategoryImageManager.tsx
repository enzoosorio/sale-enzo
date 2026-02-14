"use client";

import { useState } from "react";
import { 
  getCategoryImages, 
  uploadCategoryImages, 
  deleteCategoryImage,
  updateCategoryImageOrientation,
  type CategoryImage
} from "@/actions/categoryImages";

interface CategoryImageManagerProps {
  categoryId: string | null;
  categoryName: string | null;
  isSubcategory?: boolean; // Optional: to customize messaging
}

export function CategoryImageManager({ 
  categoryId, 
  categoryName,
  isSubcategory = false
}: CategoryImageManagerProps) {
  const [images, setImages] = useState<CategoryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  // Track orientations for files to upload
  const [uploadOrientations, setUploadOrientations] = useState<Map<number, "portrait" | "landscape">>(new Map());

  const MAX_IMAGES = 6;
  const entityType = isSubcategory ? "subcategoría" : "categoría";

  const handleLoadImages = async () => {
    if (!categoryId) {
      setError(`Primero selecciona una ${entityType}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const result = await getCategoryImages(categoryId);

    if (result.success && result.data) {
      setImages(result.data);
      setHasLoaded(true);
      if (result.data.length === 0) {
        setSuccess(`Esta ${entityType} no tiene imágenes todavía.`);
      } else {
        setSuccess(`${result.data.length} imagen(es) cargada(s)`);
      }
    } else {
      setError(result.error || "Error al cargar imágenes");
    }

    setIsLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!categoryId) {
      setError(`Primero selecciona una ${entityType}`);
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
      // Get orientation for this file, default to portrait
      const orientation = uploadOrientations.get(index) || "portrait";
      formData.append(`orientation-${index}`, orientation);
    });

    const result = await uploadCategoryImages(categoryId, formData);

    if (result.success && result.data) {
      setImages(prev => [...prev, ...result.data!]);
      setSuccess(`${result.data.length} imagen(es) subida(s) exitosamente`);
      e.target.value = ""; // Reset input
      setUploadOrientations(new Map()); // Reset orientations
    } else {
      setError(result.error || "Error al subir imágenes");
    }

    setIsUploading(false);
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta imagen?")) return;

    setError(null);
    setSuccess(null);

    const result = await deleteCategoryImage(imageId);

    if (result.success) {
      setImages(prev => prev.filter(img => img.id !== imageId));
      setSuccess("Imagen eliminada exitosamente");
    } else {
      setError(result.error || "Error al eliminar imagen");
    }
  };

  const handleOrientationChange = async (imageId: string, newOrientation: "portrait" | "landscape") => {
    setError(null);
    setSuccess(null);

    const result = await updateCategoryImageOrientation(imageId, newOrientation);

    if (result.success && result.data) {
      setImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, orientation: newOrientation } : img
      ));
      setSuccess("Orientación actualizada");
    } else {
      setError(result.error || "Error al actualizar orientación");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Initialize orientations for all selected files (default to portrait)
      const newOrientations = new Map<number, "portrait" | "landscape">();
      Array.from(files).forEach((_, index) => {
        newOrientations.set(index, "portrait");
      });
      setUploadOrientations(newOrientations);
    }
  };

  const handleOrientationSelectChange = (index: number, orientation: "portrait" | "landscape") => {
    setUploadOrientations(prev => {
      const newMap = new Map(prev);
      newMap.set(index, orientation);
      return newMap;
    });
  };

  const isDisabled = !categoryId || !categoryName;
  const canUploadMore = images.length < MAX_IMAGES;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-prata font-bold text-gray-900 mb-2">
          Gestión de Imágenes para Hover UI
        </h2>
        <p className="text-sm text-gray-600">
          {categoryName 
            ? `${isSubcategory ? 'Subcategoría' : 'Categoría'}: ${categoryName}` 
            : `Selecciona una ${entityType} para gestionar sus imágenes`}
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
          {isLoading ? "Cargando..." : `Cargar Imágenes de ${isSubcategory ? 'Subcategoría' : 'Categoría'}`}
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
                    className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                  >
                    {/* Image container with aspect ratio based on orientation */}
                    <div className={`relative ${image.orientation === "portrait" ? "aspect-3/4" : "aspect-4/3"}`}>
                      <img
                        src={image.image_url}
                        alt={`${categoryName} preview`}
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
                    
                    {/* Orientation selector */}
                    <div className="p-2 bg-white border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 font-medium">Orientación:</label>
                        <select
                          value={image.orientation}
                          onChange={(e) => handleOrientationChange(image.id, e.target.value as "portrait" | "landscape")}
                          className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
                        >
                          <option value="portrait">Portrait (3:4)</option>
                          <option value="landscape">Landscape (4:3)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6 p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <p className="text-gray-500">
                Esta {entityType} no tiene imágenes todavía.
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Sube imágenes para que aparezcan en el efecto hover del menú
              </p>
            </div>
          )}

          {/* Upload Section */}
          {canUploadMore && (
            <div className="border-t pt-4">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subir Nuevas Imágenes
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Puedes subir {MAX_IMAGES - images.length} imagen(es) más. Todas las imágenes se subirán con orientación Portrait por defecto.
                </p>
              </div>
              
              <label className="block">
                <span className="sr-only">Subir imágenes</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    handleFileSelect(e);
                    handleUpload(e);
                  }}
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
              
              {isUploading && (
                <div className="mt-3 flex items-center text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                  Subiendo imágenes...
                </div>
              )}

              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                <strong>Tip:</strong> Puedes cambiar la orientación después de subir las imágenes usando el selector que aparece en cada imagen.
              </div>
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
