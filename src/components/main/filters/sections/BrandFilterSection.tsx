import { ReusableFilterSection } from "./ReusableFilterSection";

interface BrandFilterSectionProps {
  brands: string[];
  selectedBrands: string[];
  onToggleBrand?: (brand: string) => void;
  className?: string;
  classNameForWrapper?: string;
}

export const BrandFilterSection = ({ 
  brands, 
  selectedBrands, 
  onToggleBrand,
  className,
  classNameForWrapper,
}: BrandFilterSectionProps) => {
  return (
    <ReusableFilterSection
    title="MARCA"
    className={`min-max ${className || ""}`}
    classNameForWrapper={classNameForWrapper}
    >
        {brands.map((brand) => {
          const isSelected = selectedBrands.includes(brand);
          return (
            <button
              key={brand}
              onClick={() => onToggleBrand?.(brand)}
              className={`px-3 py-2.5 text-base border border-current text-current transition-colors
                ${isSelected 
                  ? 'bg-current text-[#221C1C]' 
                  : 'opacity-90 hover:opacity-100'
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
