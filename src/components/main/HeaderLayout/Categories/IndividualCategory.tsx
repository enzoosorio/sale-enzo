"use client";
import { Categories } from "@/types/products/old_category/categories";
import React from "react";
import { useImagesCategoriesStore } from "@/store/imagesCategoriesStore";

interface IndividualCategoryProps {
  category: Categories;
  onCategoryClick: (category: Categories) => void;
}

const canHover = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

export const IndividualCategory = ({
  category,
  onCategoryClick,
}: IndividualCategoryProps) => {
  const setImagesByCategory = useImagesCategoriesStore((s) => s.setImagesByCategory);
  const setExitImagesByCategory = useImagesCategoriesStore((s) => s.setExitImagesByCategory);
  const hasImages = !!category.referenceImages?.length;

  return (
    <button
      type="button"
      onPointerEnter={() => {
        if (!hasImages || !canHover()) return;
        setExitImagesByCategory(false);
        setImagesByCategory(category.referenceImages!);
      }}
      onPointerLeave={() => {
        if (!hasImages || !canHover()) return;
        setExitImagesByCategory(true);
      }}
      onClick={() => onCategoryClick(category)}
      className="individual-category font-nanum font-light text-4xl md:text-5xl cursor-pointer text-center px-4 py-2 min-h-11 touch-manipulation rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
    >
      {category.name}
    </button>
  );
};
