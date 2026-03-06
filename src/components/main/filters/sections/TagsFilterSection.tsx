import { ReusableFilterSection } from "./ReusableFilterSection";

interface TagsFilterSectionProps {
  tags: string[];
  selectedTags: string[];
  onToggleTag?: (tag: string) => void;
}

export const TagsFilterSection = ({ 
  tags, 
  selectedTags, 
  onToggleTag 
}: TagsFilterSectionProps) => {
  return (
    <ReusableFilterSection
    title="TAGS"
    className="flex flex-wrap gap-x-4 gap-y-8"
    >
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onToggleTag?.(tag)}
              className={`px-4 min-w-28 py-2.5 border text-base rounded-none transition-colors
                ${isSelected 
                  ? 'border-black bg-black text-white' 
                  : 'border-black/20 hover:border-black/40'
                }`}
            >
              {tag}
            </button>
          );
        })}
    </ReusableFilterSection>
  );
};
