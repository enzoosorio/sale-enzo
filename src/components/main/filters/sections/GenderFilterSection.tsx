import { ReusableFilterSection } from "./ReusableFilterSection";

interface GenderFilterSectionProps {
  genders: string[];
  selectedGender?: string;
  onSelectGender?: (gender: string) => void;
}

export const GenderFilterSection = ({ 
  genders, 
  selectedGender, 
  onSelectGender 
}: GenderFilterSectionProps) => {
  return (
   <ReusableFilterSection
   title="GÉNERO"
   className="min-max"
   >
    
        {genders.map((gender) => {
          const isSelected = selectedGender === gender;
          return (
            <button
              key={gender}
              onClick={() => onSelectGender?.(gender)}
              className={`px-4 py-2.5 text-base w-full border min-w-1/2 ${gender === 'Unisex' ? "w-full" : "w-1/2"} transition-colors
                ${isSelected 
                  ? 'border-black bg-black text-white' 
                  : 'border-black/20 hover:border-black/80'
                }`}
            >
              {gender}
            </button>
          );
        })}
     </ReusableFilterSection>
  );
};
