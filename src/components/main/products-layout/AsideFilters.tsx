"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { SizeFilterSection } from "@/components/main/filters/sections/SizeFilterSection";
import { ColorFilterSection } from "@/components/main/filters/sections/ColorFilterSection";
import { BrandFilterSection } from "@/components/main/filters/sections/BrandFilterSection";
import { GenderFilterSection } from "@/components/main/filters/sections/GenderFilterSection";
import { TagsFilterSection } from "@/components/main/filters/sections/TagsFilterSection";

const mockSizes = ["S", "M", "L", "XL"];
const mockColors = [
  { name: "Smooch Rouge", hex: "#249458" },
  { name: "Rosado Salmon", hex: "#D63B57" },
  { name: "Negro Profundo", hex: "#1F1F1A" },
  { name: "Azul Light", hex: "#E2E4F7" },
];
const mockBrands = ["Nike", "Adidas", "Under Armour", "Reebok", "New Balance"];
const mockGenders = ["Masculino", "Femenino", "Unisex"];
const mockTags = [
  "Deportivo",
  "Soporte tradicional",
  "Casual",
  "Vintage",
  "Oversize",
  "Streetwear",
];

const sectionWrapperClassName = "text-white";

export const AsideFilters = () => {
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<string | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleInArray = (
    value: string,
    setList: Dispatch<SetStateAction<string[]>>
  ) => {
    setList((prev) =>
      prev.includes(value) ? prev.filter((entry) => entry !== value) : [...prev, value]
    );
  };

  return (
    <div className="flex h-full flex-col gap-8 pb-4 pt-10">
      <SizeFilterSection
        sizes={mockSizes}
        selectedSizes={selectedSizes}
        onToggleSize={(size) => toggleInArray(size, setSelectedSizes)}
        classNameForWrapper={sectionWrapperClassName}
      />

      <ColorFilterSection
        colors={mockColors}
        selectedColors={selectedColors}
        onToggleColor={(color) => toggleInArray(color, setSelectedColors)}
        classNameForWrapper={sectionWrapperClassName}
      />

      <BrandFilterSection
        brands={mockBrands}
        selectedBrands={selectedBrands}
        onToggleBrand={(brand) => toggleInArray(brand, setSelectedBrands)}
        classNameForWrapper={sectionWrapperClassName}
      />

      <GenderFilterSection
        genders={mockGenders}
        selectedGender={selectedGender}
        onSelectGender={(gender) =>
          setSelectedGender((prev) => (prev === gender ? undefined : gender))
        }
        classNameForWrapper={sectionWrapperClassName}
      />

      <TagsFilterSection
        tags={mockTags}
        selectedTags={selectedTags}
        onToggleTag={(tag) => toggleInArray(tag, setSelectedTags)}
        classNameForWrapper={sectionWrapperClassName}
      />
    </div>
  );
};
