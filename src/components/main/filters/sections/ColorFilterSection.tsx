import { useEffect, useState } from "react";
import { getContrastTextColor } from "@/utils/colors/getContrastColor";
import { ReusableFilterSection } from "./ReusableFilterSection";

interface ColorFilterSectionProps {
  colors: Array<{ name: string; hex: string }>;
  selectedColors: string[];
  onToggleColor?: (colorName: string) => void;
}

export const ColorFilterSection = ({ 
  colors, 
  selectedColors, 
  onToggleColor 
}: ColorFilterSectionProps) => {

  const [keyColorHovered, setKeyColorHovered] = useState(-1);

  useEffect(() => {
    console.log({selectedColors})
  }, [selectedColors])

  return (
   <ReusableFilterSection
   title="COLOR"
   >
    <>
        {colors.map((color, index) => {
          const isSelected = selectedColors.includes(color.name);
          const textColor = getContrastTextColor(color.hex);
          return (
            <button
              onMouseEnter={() => setKeyColorHovered(index)}
              onMouseLeave={() => setKeyColorHovered(-1)}
              key={color.name}
              onClick={() => onToggleColor?.(color.name)}
              className={`relative group w-full flex items-center justify-between px-4 py-3 border transition-colors
                ${isSelected 
                  ? 'border-black bg-black/5' 
                  : 'border-black/10 hover:border-black/20'
                }`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="absolute top-0 left-0 w-0 -z-10 group-hover:w-full transition-all duration-500 h-full" 
                  style={{ backgroundColor: isSelected || keyColorHovered === index ? color.hex : 'transparent' }}
                />
                <span className="text-black group-hover:text-white text-base transition-colors"
                // adding dynamic hover color based on contrast
                  style={{ color: isSelected || keyColorHovered === index ? textColor : 'inherit' }}
                >{color.name}</span>
              </div>
              <span className="text-xs text-black/40 group-hover:text-white transition-colors"
              style={{ color: isSelected || keyColorHovered === index ? textColor : 'inherit'}}
              >{color.hex}</span>
            </button>
          );
        })}
        </>
   </ReusableFilterSection>
  );
};
