import { ReusableFilterSection } from "./ReusableFilterSection";

interface TagsFilterSectionProps {
  tags: string[];
  selectedTags: string[];
  onToggleTag?: (tag: string) => void;
  className?: string;
  classNameForWrapper?: string;
  darkMode?: boolean;
}

export const TagsFilterSection = ({ 
  tags, 
  selectedTags, 
  onToggleTag,
  className,
  classNameForWrapper,
  darkMode = false,
}: TagsFilterSectionProps) => {
  return (
    <ReusableFilterSection
    title="TAGS"
    className={`flex flex-wrap gap-x-4 gap-y-8 ${className || ""}`}
    classNameForWrapper={classNameForWrapper}
    darkMode={darkMode}
    >
        {tags.length === 0 && (
          <p className={`px-4 text-sm ${darkMode ? 'text-white/60' : 'text-black/60'}`}>
            No tags available
          </p>
        )}
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onToggleTag?.(tag)}
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
              {tag}
            </button>
          );
        })}
    </ReusableFilterSection>
  );
};
