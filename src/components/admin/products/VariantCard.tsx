"use client";

import Image from "next/image";
import Link from "next/link";
import { Package2 } from "lucide-react";

interface VariantCardProps {
  variant: {
    id: string;
    main_img_url: string;
    size: string | null;
    gender: string | null;
    fit: string | null;
    main_color_hex: string;
    created_at: string;
    products: {
      id: string;
      name: string;
      brand: string | null;
    };
    availability: boolean;
  };
}

/**
 * VariantCard Component
 * 
 * Displays a product variant card with image, name, and availability
 * Clicking navigates to variant detail page
 */
export function VariantCard({ variant }: VariantCardProps) {
  const hasImage = variant.main_img_url && variant.main_img_url.trim() !== '';

  return (
    <Link href={`/admin/products/${variant.id}`}>
      <div className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer">
        {/* Image Section */}
        <div className="relative aspect-square bg-gray-100">
          {hasImage ? (
            <Image
              src={variant.main_img_url}
              alt={variant.products.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package2 className="w-16 h-16 text-gray-300" />
            </div>
          )}
          
          {/* Availability Badge */}
          <div className="absolute top-3 right-3">
            <span
              className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${variant.availability 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
                }
              `}
            >
              {variant.availability ? 'Available' : 'Out of Stock'}
            </span>
          </div>

          {/* Color Badge */}
          <div className="absolute bottom-3 left-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: variant.main_color_hex }}
              title={variant.main_color_hex}
            />
          </div>
        </div>

        {/* Info Section */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors mb-1 line-clamp-2">
            {variant.products.name}
          </h3>
          
          {variant.products.brand && (
            <p className="text-sm text-gray-500 mb-2">{variant.products.brand}</p>
          )}

          {/* Variant Details */}
          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            {variant.size && (
              <span className="px-2 py-1 bg-gray-100 rounded">Size: {variant.size}</span>
            )}
            {variant.gender && (
              <span className="px-2 py-1 bg-gray-100 rounded capitalize">{variant.gender}</span>
            )}
            {variant.fit && (
              <span className="px-2 py-1 bg-gray-100 rounded capitalize">{variant.fit}</span>
            )}
          </div>

          {/* Created Date */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Created: {new Date(variant.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
