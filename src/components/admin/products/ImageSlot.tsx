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
  front: "Front View",
  back: "Back View",
  logo: "Logo Detail",
  detail: "Close-up Detail",
  random: "Additional Images"
};

const positionDescriptions: Record<ImagePosition, string> = {
  front: "Main front-facing product photo",
  back: "Rear view of the product",
  logo: "Close-up of branding or logo",
  detail: "Detail shot (fabric, stitching, etc.)",
  random: "Any additional angles or details"
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
        setError(result.error || "Upload failed");
        return;
      }

      if(!result.data){
        setError("Upload failed: No data returned");
        return;
      }

      onUploadSuccess(result.data.id, result.data.image_url);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (err) {
      console.error("Upload error:", err);
      setError("An unexpected error occurred during upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingImage || !confirm("Are you sure you want to delete this image?")) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      const result = await deleteVariantImage(existingImage.id);
      if (!result.success) {
        setError(result.error || "Delete failed");
        return;
      }

      onDeleteSuccess(existingImage.id);

    } catch (err) {
      console.error("Delete error:", err);
      setError("An unexpected error occurred during deletion");
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
              aria-label="Delete image"
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
                <p className="text-sm text-gray-600">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">Click to upload</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP, AVIF</p>
                <p className="text-xs text-gray-500">Max 5MB</p>
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
