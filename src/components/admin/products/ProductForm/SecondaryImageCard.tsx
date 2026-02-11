import { SecondaryImageUI, POSITION_LABELS, ImagePosition } from '@/types/products/secondary_image';
import { X, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface SecondaryImageCardProps {
  image: SecondaryImageUI;
  onPositionChange: (imageId: string, position: ImagePosition) => void;
  onRemove: (imageId: string) => void;
  disabled?: boolean;
}

export const SecondaryImageCard = ({
  image,
  onPositionChange,
  onRemove,
  disabled = false
}: SecondaryImageCardProps) => {
  return (
    <div className="relative group">
      {/* Image Preview */}
      <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-100">
        <Image
          src={image.previewUrl}
          alt={image.file.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        
        {/* Loading Overlay */}
        {image.isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}

        {/* Remove Button */}
        <button
          type="button"
          onClick={() => onRemove(image.id)}
          disabled={disabled || image.isUploading}
          className="absolute top-1 right-1 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Eliminar imagen"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Image Info */}
      <div className="mt-2 space-y-2">
        {/* File Name */}
        <p className="text-xs text-gray-600 truncate" title={image.file.name}>
          {image.file.name}
        </p>

        {/* Position Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Posición
          </label>
          <select
            value={image.position}
            onChange={(e) => onPositionChange(image.id, e.target.value as ImagePosition)}
            disabled={disabled || image.isUploading}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {Object.entries(POSITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
