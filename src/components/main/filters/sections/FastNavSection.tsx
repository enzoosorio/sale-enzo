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
}

export const FastNavSection = ({ 
  title = "SUBCATEGORIES",
  items,
  selectedSlugs,
  onSelectItem,
  className,
  classNameForWrapper,
}: FastSubcategoriesSectionProps) => {
  return (
    <ReusableFilterSection
    title={title}
    className={`flex flex-wrap gap-x-4 gap-y-8 ${className || ""}`}
    classNameForWrapper={classNameForWrapper}
    >
        {items.length === 0 && (
          <p className="px-4 text-sm text-black/60">No navigation items available</p>
        )}
        {items.map((item) => {
          const isSelected = selectedSlugs.includes(item.slug);
          return (
            <button
              key={item.slug}
              onClick={() => onSelectItem?.(item.slug)}
              className={`px-4 min-w-28 py-2.5 border border-current text-current text-base rounded-none transition-colors
                ${isSelected 
                  ? 'bg-off-black text-off-white' 
                  : 'opacity-90 hover:opacity-100'
                }`}
            >
              {item.name}
            </button>
          );
        })}
    </ReusableFilterSection>
  );
};
