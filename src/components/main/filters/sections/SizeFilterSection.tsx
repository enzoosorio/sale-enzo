import React from "react";
import { ReusableFilterSection } from "./ReusableFilterSection";

interface SizeFilterSectionProps {
  sizes: string[];
  selectedSizes: string[];
  onToggleSize?: (size: string) => void;
  className?: string;
  classNameForWrapper?: string;
  darkMode?: boolean;
}

export const SizeFilterSection = ({ 
  sizes, 
  selectedSizes, 
  onToggleSize,
  className,
  classNameForWrapper,
  darkMode = false,
}: SizeFilterSectionProps) => {

  return (
    <ReusableFilterSection
    title="TALLA"
    className={`min-max ${className || ""}`}
    classNameForWrapper={classNameForWrapper}
    darkMode={darkMode}
    >
      <>
        {sizes.map((size) => {
          const isSelected = selectedSizes.some(
            (selectedSize) => selectedSize.toLowerCase() === size.toLowerCase()
          );
          return (
            <button
              key={size}
              onClick={() => onToggleSize?.(size)}
              className={`relative px-4 overflow-hidden max-h-24 flex-1 py-2.5 min-w-1/2 text-base border transition-colors cursor-pointer
                ${darkMode 
                  ? isSelected 
                    ? 'bg-[#FAF9F6] text-[#221C1C] border-[#FAF9F6]' 
                    : 'border-white text-white hover:bg-white/10'
                  : isSelected 
                    ? 'bg-[#221C1C] text-[#FAF9F6] border-[#221C1C]' 
                    : 'border-current text-current opacity-90 hover:opacity-100'
                }`}
            >
              {size} 
            </button>
          );
        })}
        </>
    </ReusableFilterSection>
  );
};
