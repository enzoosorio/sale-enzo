import { ReusableFilterSection } from "./ReusableFilterSection";

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
              className={`px-4 flex-1 py-2.5 min-w-1/2 text-base border transition-colors
                ${isSelected 
                  ? 'border-black bg-black text-white' 
                  : 'border-black/20 hover:border-black/40'
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
