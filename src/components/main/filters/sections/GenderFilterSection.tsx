import { ReusableFilterSection } from "./ReusableFilterSection";

interface GenderFilterSectionProps {
  genders: string[];
  selectedGender?: string;
  onSelectGender?: (gender: string) => void;
  className?: string;
  classNameForWrapper?: string;
}

export const GenderFilterSection = ({ 
  genders, 
  selectedGender, 
  onSelectGender,
  className,
  classNameForWrapper,
}: GenderFilterSectionProps) => {
  return (
   <ReusableFilterSection
   title="GÉNERO"
   className={`min-max ${className || ""}`}
   classNameForWrapper={classNameForWrapper}
   >
    
        {genders.map((gender) => {
          const isSelected = selectedGender === gender;
          return (
            <button
              key={gender}
              onClick={() => onSelectGender?.(gender)}
              className={`px-4 py-2.5 text-base w-full border border-current text-current min-w-1/2 ${gender === 'Unisex' ? "w-full" : "w-1/2"} transition-colors
                ${isSelected 
                  ? 'bg-off-black text-off-white' 
                  : 'opacity-90 hover:opacity-100'
                }`}
            >
              {gender}
            </button>
          );
        })}
     </ReusableFilterSection>
  );
};
