import { VariantCard } from './VariantCard';

interface Variant {
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
}

interface VariantGridProps {
  variants: Variant[];
}

/**
 * VariantGrid Component
 * 
 * Responsive grid layout for variant cards
 * Reusable for admin and public storefront
 */
export function VariantGrid({ variants }: VariantGridProps) {
  if (variants.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="max-w-md mx-auto">
          <p className="text-gray-500 text-lg mb-2">No variants found</p>
          <p className="text-gray-400 text-sm">
            Try adjusting your search or create a new product
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {variants.map((variant) => (
        <VariantCard key={variant.id} variant={variant} />
      ))}
    </div>
  );
}
