"use client";

import { useState } from "react";
import { getContrastTextColor } from "@/utils/colors/getContrastColor";
import { ReusableFilterSection } from "./ReusableFilterSection";

interface ColorFilterSectionProps {
  colors: Array<{ name: string; hex: string }>;
  selectedColors: string[];
  onToggleColor?: (colorName: string) => void;
  className?: string;
  classNameForWrapper?: string;
}

export const ColorFilterSection = ({
  colors,
  selectedColors,
  onToggleColor,
  className,
  classNameForWrapper,
}: ColorFilterSectionProps) => {
  const [keyColorHovered, setKeyColorHovered] = useState<number | null>(null);

  return (
    <ReusableFilterSection
      title="COLOR"
      className={className}
      classNameForWrapper={classNameForWrapper}
    >
      <>
        {colors.map((color, index) => {
          const isSelected = selectedColors.includes(color.name);
          const isHovered = keyColorHovered === index;
          const textColor = getContrastTextColor(color.hex);

          return (
            <button
              key={color.name}
              onMouseEnter={() => setKeyColorHovered(index)}
              onMouseLeave={() => setKeyColorHovered(null)}
              onClick={() => onToggleColor?.(color.name)}
              className={`
                relative w-full flex items-center justify-between px-4 py-3
                border border-current transition-colors overflow-hidden cursor-pointer
                ${!isSelected ? "opacity-90 hover:opacity-100" : ""}
              `}
              style={{
                backgroundColor: isSelected ? color.hex : undefined,
                color: isSelected ? textColor : undefined,
              }}
            >
              {/* 🌊 Overlay SOLO para hover cuando NO está seleccionado */}
              {!isSelected && (
                <div
                  className={`
                    absolute top-0 left-0 h-full w-0
                    transition-all duration-500 z-0
                    ${isHovered ? "w-full" : ""}
                  `}
                  style={{ backgroundColor: color.hex }}
                />
              )}

              {/* 🧱 Contenido */}
              <div className="relative z-10 flex items-center gap-3">
                <span
                  className="text-base transition-colors"
                  style={{
                    color:
                      isSelected || isHovered ? textColor : "inherit",
                  }}
                >
                  {color.name}
                </span>
              </div>

              <span
                className="relative z-10 text-xs transition-colors"
                style={{
                  color:
                    isSelected || isHovered ? textColor : "inherit",
                }}
              >
                {color.hex}
              </span>
            </button>
          );
        })}
      </>
    </ReusableFilterSection>
  );
};