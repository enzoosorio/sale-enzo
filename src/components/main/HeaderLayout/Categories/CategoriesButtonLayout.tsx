"use client";
import { CategoriesPanel } from "./CategoriesPanel";
import { useCategoriesStore } from "@/store/categorySection";
import { createPortal } from "react-dom";
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
      {
        showCategories && createPortal(
          <CategoriesPanel />,
          document.body
        )
      }
    </>
  );
};
