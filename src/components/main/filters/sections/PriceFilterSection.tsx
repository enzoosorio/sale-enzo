import { Slider } from "@/components/ui/slider";
import { ReusableFilterSection } from "./ReusableFilterSection";

interface PriceFilterSectionProps {
  min: number;
  max: number;
  value: [number, number];
  onChange?: (value: [number, number]) => void;
}

export const PriceFilterSection = ({ 
  min, 
  max, 
  value, 
  onChange 
}: PriceFilterSectionProps) => {

  return (
    <ReusableFilterSection
    title="PRECIO"
    // className="px-2"
    classNameForWrapper="pb-8"
    >
        <div className="flex justify-between text-sm text-black/60 mb-4 px-4">
          <span>S/{value[0]}</span>
          <span>S/{value[1]}</span>
        </div>
        <Slider
        id="price-range-slider"
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={1}
      />
    </ReusableFilterSection>
  );
};
