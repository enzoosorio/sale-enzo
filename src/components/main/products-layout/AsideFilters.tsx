"use client";

import { useEffect, useRef } from "react";
import { SizeFilterSection } from "@/components/main/filters/sections/SizeFilterSection";
import { ColorFilterSection } from "@/components/main/filters/sections/ColorFilterSection";
import { BrandFilterSection } from "@/components/main/filters/sections/BrandFilterSection";
import { GenderFilterSection } from "@/components/main/filters/sections/GenderFilterSection";
import { TagsFilterSection } from "@/components/main/filters/sections/TagsFilterSection";
import { FastNavSection } from "../filters/sections/FastNavSection";
import { RpcAvailableFilters } from "@/utils/filters";
import { RpcNavigation } from "@/utils/filters/rpcCategoryFilters";
import { PriceFilterSection } from "../filters/sections/PriceFilterSection";

interface AsideFilterProps {
  isLoading?: boolean;
  availableFilters?: RpcAvailableFilters;
  navigation?: RpcNavigation;
  selectedCategory?: string;
  selectedSubcategory?: string;
  selectedSizes?: string[];
  selectedColors?: string[];
  selectedBrands?: string[];
  selectedTags?: string[];
  selectedGender?: string;
  priceValue?: [number, number];
  onSelectCategory?: (categorySlug: string) => void;
  onSelectSubcategory?: (subcategorySlug: string) => void;
  onToggleSize?: (size: string) => void;
  onToggleColor?: (color: string) => void;
  onToggleBrand?: (brand: string) => void;
  onToggleTag?: (tag: string) => void;
  onSelectGender?: (gender: string) => void;
  onChangePrice?: (value: [number, number]) => void;
}

export const AsideFilters = ({
  isLoading = false,
  availableFilters,
  navigation,
  selectedCategory,
  selectedSubcategory,
  selectedSizes = [],
  selectedColors = [],
  selectedBrands = [],
  selectedTags = [],
  selectedGender,
  priceValue = [0, 150],
  onSelectCategory,
  onSelectSubcategory,
  onToggleSize,
  onToggleColor,
  onToggleBrand,
  onToggleTag,
  onSelectGender,
  onChangePrice,
}: AsideFilterProps) => {
  const asideFiltersRef = useRef<HTMLDivElement | null>(null);
  const sizeOptions = availableFilters?.sizes.map((size) => size.value) || [];
  const colorOptions =
    availableFilters?.colors.map((color) => ({
      name: color.label,
      hex: color.representative_hex,
    })) || [];
  const brandOptions = availableFilters?.brands.map((brand) => brand.value) || [];
  const genderOptions = availableFilters?.genders.map((gender) => gender.value) || [];
  const tagOptions =
    availableFilters?.tags
      .map((tag) => tag.slug || tag.name)
      .filter(Boolean) || [];

  const priceMin = availableFilters?.price_range.min ?? 0;
  const priceMax = availableFilters?.price_range.max ?? 150;
  const safeMin = Number.isFinite(priceMin) ? Number(priceMin) : 0;
  const safeMax = Number.isFinite(priceMax) ? Number(priceMax) : 150;

  const rangeMin = Math.floor(Math.min(safeMin, safeMax));
  const rangeMax = Math.ceil(Math.max(safeMin, safeMax));
  const normalizedMax = rangeMin === rangeMax ? rangeMax + 1 : rangeMax;

  const normalizedPriceValue: [number, number] = [
    Math.min(Math.max(priceValue[0], rangeMin), normalizedMax),
    Math.min(Math.max(priceValue[1], rangeMin), normalizedMax),
  ].sort((a, b) => a - b) as [number, number];

  const hasSubcategorySelected = typeof selectedSubcategory === 'string' && selectedSubcategory.length > 0;
  const navigationItems = hasSubcategorySelected
    ? (navigation?.subcategories || [])
    : (navigation?.categories || []);

  const selectedNavigationSlugs = hasSubcategorySelected
    ? (selectedSubcategory ? [selectedSubcategory] : [])
    : (selectedCategory ? [selectedCategory] : []);

  useEffect(() => {
   
    // we must avoid scrolling propagation to body when scrolling in filters, but only when the filters are in their own scrollable container (not on mobile)
      const handleWheel = (e: WheelEvent) => {
       e.stopPropagation();
      }

      const current = asideFiltersRef.current;
      if (current) {
        current.addEventListener("wheel", handleWheel, { passive: true });
      }

      return () => {
        if (current) {
          current.removeEventListener("wheel", handleWheel);
        }
      };
  })

  return (
    <div ref={asideFiltersRef}
     className="flex h-full flex-col gap-8 pb-40 pt-4 overflow-auto px-4">
      <FastNavSection
        items={navigationItems}
        selectedSlugs={selectedNavigationSlugs}
        onSelectItem={(slug) => {
          if (hasSubcategorySelected) {
            onSelectSubcategory?.(slug);
            return;
          }
          onSelectCategory?.(slug);
        }}
        darkMode
      />

      <SizeFilterSection 
              sizes={sizeOptions}
              selectedSizes={selectedSizes}
              onToggleSize={onToggleSize}
              darkMode
            />
            
            <ColorFilterSection 
              colors={colorOptions}
              selectedColors={selectedColors}
              onToggleColor={onToggleColor}
            />
            
            <BrandFilterSection 
              brands={brandOptions}
              selectedBrands={selectedBrands}
              onToggleBrand={onToggleBrand}
              darkMode
            />
            
            <GenderFilterSection 
              genders={genderOptions}
              selectedGender={selectedGender}
              onSelectGender={onSelectGender}
              darkMode
            />
            
            <TagsFilterSection 
              tags={tagOptions}
              selectedTags={selectedTags}
              onToggleTag={onToggleTag}
              darkMode
            />
            
            <PriceFilterSection 
              min={rangeMin}
              max={normalizedMax}
              value={normalizedPriceValue}
              onChange={onChangePrice}
              darkMode
            />
            {/* <div className="w-1 h-8 bg-amber-300"/> */}
    </div>
  );
};
