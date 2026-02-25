"use client";
import { useState } from "react";
import { Categories } from "./Categories";
import { useCategoriesStore } from "@/store/categorySection";

export const CategoriesButton = () => {
  const { showCategories, setShowCategories } = useCategoriesStore();
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  return (
    <>
      <button
        className="cursor-pointer"
        onClick={() => {
          setShowCategories(!showCategories);
        //   setIsAnimating(true);
        }}
        onMouseEnter={() => {
          // TODO: pre loader de las categorias padre
        }}
      >
        Categorías
      </button>
      <Categories
        showCategories={showCategories}
        setShowCategories={setShowCategories}
        isAnimating={isAnimating}
        setIsAnimating={setIsAnimating}
      />
    </>
  );
};
