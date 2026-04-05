import { ReusableFilterSection } from "./ReusableFilterSection";

interface GenderFilterSectionProps {
  genders: string[];
  selectedGender?: string;
  onSelectGender?: (gender: string) => void;
  className?: string;
  classNameForWrapper?: string;
  darkMode?: boolean;
}

export const GenderFilterSection = ({ 
  genders, 
  selectedGender, 
  onSelectGender,
  className,
  classNameForWrapper,
  darkMode = false,
}: GenderFilterSectionProps) => {
  return (
   <ReusableFilterSection
   title="GÉNERO"
   className={`min-max ${className || ""}`}
   classNameForWrapper={classNameForWrapper}
   darkMode={darkMode}
   >
    
        {genders.map((gender) => {
          const isSelected = selectedGender === gender;
          return (
            <button
              key={gender}
              onClick={() => onSelectGender?.(gender)}
              className={`px-4 py-2.5 text-base w-full border min-w-1/2 ${gender === 'Unisex' ? "w-full" : "w-1/2"} transition-colors cursor-pointer
                ${darkMode 
                  ? isSelected 
                    ? 'bg-[#FAF9F6] text-[#221C1C] border-[#FAF9F6]' 
                    : 'border-white text-white hover:bg-white/10'
                  : isSelected 
                    ? 'bg-[#221C1C] text-[#FAF9F6] border-[#221C1C]' 
                    : 'border-current text-current opacity-90 hover:opacity-100'
                }`}
            >
              {gender}
            </button>
          );
        })}
     </ReusableFilterSection>
  );
};
