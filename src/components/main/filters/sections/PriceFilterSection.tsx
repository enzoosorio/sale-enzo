import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { ReusableFilterSection } from "./ReusableFilterSection";

interface PriceFilterSectionProps {
  min: number;
  max: number;
  value: [number, number];
  onChange?: (value: [number, number]) => void;
  darkMode?: boolean;
}

export const PriceFilterSection = ({ min, max, value, onChange, darkMode = false }: PriceFilterSectionProps) => {
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const displayed = draft ?? value;
  return (
    <ReusableFilterSection title="PRECIO" classNameForWrapper="pb-8" darkMode={darkMode}>
      <div className={`flex justify-between text-sm mb-4 px-4 ${darkMode ? 'text-white/60' : 'text-black/60'}`}>
        <span>S/{displayed[0]}</span><span>S/{displayed[1]}</span>
      </div>
      <Slider
        aria-label="Rango de precios"
        value={displayed}
        onValueChange={next => { if (next.length === 2) setDraft([next[0], next[1]]); }}
        onValueCommit={next => {
          if (next.length === 2) onChange?.([next[0], next[1]]);
          setDraft(null);
        }}
        min={min} max={max} step={1} className={darkMode ? 'slider-dark' : ''}
      />
    </ReusableFilterSection>
  );
};
