import { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { ReusableFilterSection } from "./ReusableFilterSection";

interface PriceFilterSectionProps {
  min: number;
  max: number;
  value: [number, number];
  onChange?: (value: [number, number]) => void;
  darkMode?: boolean;
}

export const PriceFilterSection = ({ 
  min, 
  max, 
  value, 
  onChange,
  darkMode = false,
}: PriceFilterSectionProps) => {
  const [localValue, setLocalValue] = useState<[number, number]>(value);
  const isUserInteractingRef = useRef(false);

  useEffect(() => {
    const sameValue = localValue[0] === value[0] && localValue[1] === value[1];

    if (sameValue) {
      isUserInteractingRef.current = false;
      return;
    }

    if (!isUserInteractingRef.current) {
      setLocalValue(value);
    }
  }, [localValue, value]);

  useEffect(() => {
    if (!onChange) return;
    if (localValue[0] === value[0] && localValue[1] === value[1]) return;

    const timeout = window.setTimeout(() => {
      onChange(localValue);
      isUserInteractingRef.current = false;
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [localValue, onChange, value]);

  return (
    <ReusableFilterSection
    title="PRECIO"
    classNameForWrapper="pb-8"
    darkMode={darkMode}
    >
        <div className={`flex justify-between text-sm mb-4 px-4 ${darkMode ? 'text-white/60' : 'text-black/60'}`}>
          <span>S/{value[0]}</span>
          <span>S/{value[1]}</span>
        </div>
        <Slider
        id="price-range-slider"
        value={localValue}
        onValueChange={(nextValue) => {
          if (nextValue.length !== 2) return;
          isUserInteractingRef.current = true;
          setLocalValue([nextValue[0], nextValue[1]]);
        }}
        min={min}
        max={max}
        step={1}
        className={darkMode ? 'slider-dark' : ''}
      />
    </ReusableFilterSection>
  );
};
