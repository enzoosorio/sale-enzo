import { ReusableFilterSection } from "./ReusableFilterSection";

interface FastSubcategoriesSectionProps {
  subcategories: string[];
  selectedSubcategories: string[];
  onToggleSubcategory?: (subcategoryId: string) => void;
  className?: string;
  classNameForWrapper?: string;
}

export const FastNavSection = ({ 
  subcategories, 
  selectedSubcategories, 
  onToggleSubcategory,
  className,
  classNameForWrapper,
}: FastSubcategoriesSectionProps) => {
  return (
    <ReusableFilterSection
    title="SUBCATEGORIES"
    className={`flex flex-wrap gap-x-4 gap-y-8 ${className || ""}`}
    classNameForWrapper={classNameForWrapper}
    >
        {subcategories.length === 0 && (
          <p className="px-4 text-sm text-black/60">No subcategories available</p>
        )}
        {subcategories.map((subcategoryId) => {
          const isSelected = selectedSubcategories.includes(subcategoryId);
          return (
            <button
              key={subcategoryId}
              onClick={() => onToggleSubcategory?.(subcategoryId)}
              className={`px-4 min-w-28 py-2.5 border border-current text-current text-base rounded-none transition-colors
                ${isSelected 
                  ? 'bg-off-black text-off-white' 
                  : 'opacity-90 hover:opacity-100'
                }`}
            >
              {subcategoryId}
            </button>
          );
        })}
    </ReusableFilterSection>
  );
};
