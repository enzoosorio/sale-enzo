import { ReusableFilterSection } from "./ReusableFilterSection";

interface BrandFilterSectionProps {
  brands: string[];
  selectedBrands: string[];
  onToggleBrand?: (brand: string) => void;
}

export const BrandFilterSection = ({ 
  brands, 
  selectedBrands, 
  onToggleBrand 
}: BrandFilterSectionProps) => {
  return (
    <ReusableFilterSection
    title="MARCA"
    className="min-max"
    >
        {brands.map((brand) => {
          const isSelected = selectedBrands.includes(brand);
          return (
            <button
              key={brand}
              onClick={() => onToggleBrand?.(brand)}
              className={`px-3 py-2.5 text-base border transition-colors
                ${isSelected 
                  ? 'border-black bg-black text-white' 
                  : 'border-black/20 hover:border-black/80'
                }`}
            >
              {brand}
            </button>
          );
        })}
      {/* </div> */}
    </ReusableFilterSection>
  );
};
