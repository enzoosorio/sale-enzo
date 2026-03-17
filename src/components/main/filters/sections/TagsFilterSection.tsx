import { ReusableFilterSection } from "./ReusableFilterSection";

interface TagsFilterSectionProps {
  tags: string[];
  selectedTags: string[];
  onToggleTag?: (tag: string) => void;
  className?: string;
  classNameForWrapper?: string;
}

export const TagsFilterSection = ({ 
  tags, 
  selectedTags, 
  onToggleTag,
  className,
  classNameForWrapper,
}: TagsFilterSectionProps) => {
  return (
    <ReusableFilterSection
    title="TAGS"
    className={`flex flex-wrap gap-x-4 gap-y-8 ${className || ""}`}
    classNameForWrapper={classNameForWrapper}
    >
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onToggleTag?.(tag)}
              className={`px-4 min-w-28 py-2.5 border border-current text-current text-base rounded-none transition-colors
                ${isSelected 
                  ? 'bg-current text-[#221C1C]' 
                  : 'opacity-90 hover:opacity-100'
                }`}
            >
              {tag}
            </button>
          );
        })}
    </ReusableFilterSection>
  );
};
