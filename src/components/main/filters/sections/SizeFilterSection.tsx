import React from "react";
import { ReusableFilterSection } from "./ReusableFilterSection";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface SizeFilterSectionProps {
  sizes: string[];
  selectedSizes: string[];
  onToggleSize?: (size: string) => void;
}

export const SizeFilterSection = ({ 
  sizes, 
  selectedSizes, 
  onToggleSize 
}: SizeFilterSectionProps) => {

  return (
    <ReusableFilterSection
    title="TALLA"
    className="min-max"
    >
      <>
        {sizes.map((size) => {
          const isSelected = selectedSizes.includes(size);
          return (
            <button
              key={size}
              onClick={() => onToggleSize?.(size)}
              className={`relative px-4 overflow-hidden max-h-24 flex-1 py-2.5 min-w-1/2 text-base border transition-colors
                ${isSelected 
                  ? 'border-black bg-black text-white' 
                  : 'border-black/20 hover:border-black/80'
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
