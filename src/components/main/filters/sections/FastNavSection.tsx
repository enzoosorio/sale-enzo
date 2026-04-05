import { ReusableFilterSection } from "./ReusableFilterSection";

interface FastSubcategoriesSectionProps {
  title?: string;
  items: Array<{
    slug: string;
    name: string;
    count?: number;
  }>;
  selectedSlugs: string[];
  onSelectItem?: (slug: string) => void;
  className?: string;
  classNameForWrapper?: string;
  darkMode?: boolean;
}

export const FastNavSection = ({ 
  items,
  selectedSlugs,
  onSelectItem,
  className,
  classNameForWrapper,
  darkMode = false,
}: FastSubcategoriesSectionProps) => {
  return (
    <ReusableFilterSection
    className={`flex flex-wrap gap-x-4 gap-y-8 ${className || ""}`}
    classNameForWrapper={classNameForWrapper}
    darkMode={darkMode}
    >
        {items.length === 0 && (
          <p className={`px-4 text-sm ${darkMode ? 'text-white/60' : 'text-black/60'}`}>
            No navigation items available
          </p>
        )}
        {items.map((item) => {
          const isSelected = selectedSlugs.includes(item.slug);
          return (
            <button
              key={item.slug}
              onClick={() => onSelectItem?.(item.slug)}
              className={`px-4 min-w-28 py-2.5 border text-base rounded-none transition-colors cursor-pointer
                ${darkMode 
                  ? isSelected 
                    ? 'bg-[#FAF9F6] text-[#221C1C] border-[#FAF9F6]' 
                    : 'border-white text-white hover:bg-white/10'
                  : isSelected 
                    ? 'bg-[#221C1C] text-[#FAF9F6] border-[#221C1C]' 
                    : 'border-current text-current opacity-90 hover:opacity-100'
                }`}
            >
              {item.name}
            </button>
          );
        })}
    </ReusableFilterSection>
  );
};
