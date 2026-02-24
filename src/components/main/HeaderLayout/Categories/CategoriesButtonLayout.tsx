"use client";

import { useState } from "react";
import { Categories } from "./Categories";
import { useCategoriesStore } from "@/store/categorySection";

export const CategoriesButton = () => {
  const { showCategories, setShowCategories } = useCategoriesStore();
  return (
    <>
      <button
        className="cursor-pointer"
        onClick={() => {
          setShowCategories(!showCategories);
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
      />
    </>
  );
};
