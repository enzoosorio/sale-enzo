"use client";
import { Categories } from "@/types/products/old_category/categories";
import React from "react";
import { useImagesCategoriesStore } from "@/store/imagesCategoriesStore";

interface IndividualCategoryProps {
  category: Categories;
  onCategoryClick: (category: Categories) => void;
  isDisabled?: boolean;
}

export const IndividualCategory = ({
  category,
  onCategoryClick,
  isDisabled = false,
}: IndividualCategoryProps) => {
  const {
    setExitImagesByCategory,
    setImagesByCategory,
    exitImagesByCategory,
  } = useImagesCategoriesStore();

  return (
     <p
        onMouseEnter={() => {
          if (isDisabled) return;

          setTimeout(() => {
            if (exitImagesByCategory) {
              setExitImagesByCategory(false);
            }

            // Only set images if referenceImages exist
            if (category.referenceImages && category.referenceImages.length > 0) {
              setImagesByCategory(category.referenceImages);
            }
          }, 100);
        }}
        onMouseLeave={() => {
          // Only trigger exit animation if there are images to exit
          if (category.referenceImages && category.referenceImages.length > 0) {
            setExitImagesByCategory(true);
          }
        }}
        onClick={(e) => {
          if (isDisabled) return;
          e.stopPropagation();
          onCategoryClick(category);
        }}
        className={`
          p-tag individual-category font-nanum font-light text-5xl cursor-pointer text-center px-4 py-1 transition-all touch-manipulation
          ${isDisabled ? "pointer-events-none opacity-50" : ""}`}
      >
        {category.name}
      </p> 
  );
};
