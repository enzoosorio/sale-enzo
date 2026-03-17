import React from "react";
import { ReusableFilterSection } from "./ReusableFilterSection";

interface SizeFilterSectionProps {
  sizes: string[];
  selectedSizes: string[];
  onToggleSize?: (size: string) => void;
  className?: string;
  classNameForWrapper?: string;
}

export const SizeFilterSection = ({ 
  sizes, 
  selectedSizes, 
  onToggleSize,
  className,
  classNameForWrapper,
}: SizeFilterSectionProps) => {

  return (
    <ReusableFilterSection
    title="TALLA"
    className={`min-max ${className || ""}`}
    classNameForWrapper={classNameForWrapper}
    >
      <>
        {sizes.map((size) => {
          const isSelected = selectedSizes.includes(size);
          return (
            <button
              key={size}
              onClick={() => onToggleSize?.(size)}
              className={`relative px-4 overflow-hidden max-h-24 flex-1 py-2.5 min-w-1/2 text-base border border-current text-current transition-colors
                ${isSelected 
                  ? 'bg-current text-[#221C1C]' 
                  : 'opacity-90 hover:opacity-100'
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
