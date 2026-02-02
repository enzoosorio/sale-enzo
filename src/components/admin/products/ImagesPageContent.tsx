"use client";

import { useState } from "react";
import { Search, Loader2, ImageIcon, Package } from "lucide-react";
import { ImageSlot } from "@/components/admin/products/ImageSlot";
import { PhotoGuidelines } from "@/components/admin/products/PhotoGuidelines";
import Image from "next/image";
import type { ImagePosition } from "@/schema/variantImageSchema";
import { getVariantInfo } from "@/lib/products/variants/getVariantInfo";
import { getVariantImages } from "@/lib/products/images/getVariantImages";

interface VariantInfo {
  variant: {
    id: string;
    product_id: string;
    size: string | null;
    gender: string | null;
    fit: string | null;
    main_img_url: string;
    main_color_hex: string;
  };
  product: {
    id: string;
    name: string;
    brand: string | null;
    product_categories: {
      name: string;
      slug: string;
    } | null;
  };
  additionalImagesCount: number;
}

interface VariantImage {
  id: string;
  variant_id: string;
  image_url: string;
  position: ImagePosition | null;
  created_at: string;
}

export function ImagesPageContent() {
  const [variantId, setVariantId] = useState("");
  const [variantInfo, setVariantInfo] = useState<VariantInfo | null>(null);
  const [images, setImages] = useState<VariantImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!variantId.trim()) {
      setError("Please enter a variant ID");
      return;
    }

    setError(null);
    setIsLoading(true);
    setVariantInfo(null);
    setImages([]);

    try {
      const infoResult = await getVariantInfo(variantId.trim());

      if (!infoResult.success || !infoResult.data) {
        setError(infoResult.error || "Variant not found");
        return;
      }

      setVariantInfo(infoResult.data);

      // Fetch images
      const imagesResult = await getVariantImages(variantId.trim());
      
      if (imagesResult.success) {
        setImages(imagesResult.data || []);
      }

    } catch (err) {
      console.error("Search error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = (imageId: string, imageUrl: string, position: ImagePosition) => {
    const newImage: VariantImage = {
      id: imageId,
      variant_id: variantId,
      image_url: imageUrl,
      position,
      created_at: new Date().toISOString()
    };
    setImages(prev => [...prev, newImage]);
  };

  const handleDeleteSuccess = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const getImageByPosition = (position: ImagePosition) => {
    return images.find(img => img.position === position);
  };

  const getRandomImages = () => {
    return images.filter(img => img.position === "random");
  };

  const uniquePositions: ImagePosition[] = ["front", "back", "logo", "detail"];

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Find Variant
        </h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              placeholder="Enter variant UUID..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Photo Guidelines */}
      {variantInfo && <PhotoGuidelines />}

      {/* Variant Info */}
      {variantInfo && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start gap-6">
            {/* Main Image */}
            <div className="relative w-40 h-40 rounded-lg overflow-hidden border border-gray-200 shrink-0">
              <Image
                src={variantInfo.variant.main_img_url}
                alt="Main variant image"
                fill
                className="object-cover"
                sizes="160px"
              />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {variantInfo.product.name}
                </h2>
                {variantInfo.product.brand && (
                  <p className="text-sm text-gray-600">
                    Brand: {variantInfo.product.brand}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {variantInfo.product.product_categories && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Category</p>
                    <p className="text-sm font-medium text-gray-900">
                      {variantInfo.product.product_categories.name}
                    </p>
                  </div>
                )}
                {variantInfo.variant.size && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Size</p>
                    <p className="text-sm font-medium text-gray-900">
                      {variantInfo.variant.size}
                    </p>
                  </div>
                )}
                {variantInfo.variant.gender && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Gender</p>
                    <p className="text-sm font-medium text-gray-900">
                      {variantInfo.variant.gender}
                    </p>
                  </div>
                )}
                {variantInfo.variant.fit && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Fit</p>
                    <p className="text-sm font-medium text-gray-900">
                      {variantInfo.variant.fit}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ImageIcon className="w-4 h-4" />
                  <span>{variantInfo.additionalImagesCount} additional images</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package className="w-4 h-4" />
                  <span className="font-mono text-xs">{variantInfo.variant.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Slots */}
      {variantInfo && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Additional Images
          </h2>

          {/* Unique Position Slots */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {uniquePositions.map((position) => (
              <ImageSlot
                key={position}
                position={position}
                variantId={variantInfo.variant.id}
                existingImage={getImageByPosition(position)}
                onUploadSuccess={(id, url) => handleUploadSuccess(id, url, position)}
                onDeleteSuccess={handleDeleteSuccess}
              />
            ))}
          </div>

          {/* Random Images Section */}
          <div>
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Random / Additional Images
              </h3>
              <p className="text-sm text-gray-600">
                Upload multiple images for any additional angles or details
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Existing random images */}
              {getRandomImages().map((image) => (
                <ImageSlot
                  key={image.id}
                  position="random"
                  variantId={variantInfo.variant.id}
                  existingImage={image}
                  allowMultiple={true}
                  onUploadSuccess={(id, url) => handleUploadSuccess(id, url, "random")}
                  onDeleteSuccess={handleDeleteSuccess}
                />
              ))}

              {/* New upload slot */}
              <ImageSlot
                position="random"
                variantId={variantInfo.variant.id}
                existingImage={null}
                allowMultiple={true}
                onUploadSuccess={(id, url) => handleUploadSuccess(id, url, "random")}
                onDeleteSuccess={handleDeleteSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
