import { ReusableFilterSection } from "./ReusableFilterSection";

interface BrandFilterSectionProps {
  brands: string[];
  selectedBrands: string[];
  onToggleBrand?: (brand: string) => void;
  className?: string;
  classNameForWrapper?: string;
  darkMode?: boolean;
}

export const BrandFilterSection = ({ 
  brands, 
  selectedBrands, 
  onToggleBrand,
  className,
  classNameForWrapper,
  darkMode = false,
}: BrandFilterSectionProps) => {

  return (
    <ReusableFilterSection
    title="MARCA"
    className={`min-max ${className || ""}`}
    classNameForWrapper={classNameForWrapper}
    darkMode={darkMode}
    >
        {brands.map((brand) => {
          const isSelected = selectedBrands.some(
            (selectedBrand) => selectedBrand.toLowerCase() === brand.toLowerCase()
          );
          return (
            <button
              key={brand}
              onClick={() => onToggleBrand?.(brand)}
              className={`px-3 py-2.5 text-base border transition-colors cursor-pointer
                ${darkMode 
                  ? isSelected 
                    ? 'bg-[#FAF9F6] text-[#221C1C] border-[#FAF9F6]' 
                    : 'border-white text-white hover:bg-white/10'
                  : isSelected 
                    ? 'bg-[#221C1C] text-[#FAF9F6] border-[#221C1C]' 
                    : 'border-current text-current opacity-90 hover:opacity-100'
                }`}
            >
              {brand}
            </button>
          );
        })}
    </ReusableFilterSection>
  );
};
