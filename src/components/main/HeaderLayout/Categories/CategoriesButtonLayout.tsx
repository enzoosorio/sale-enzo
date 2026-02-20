'use client'

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
        document.body.style.overflow = !showCategories ? 'hidden' : 'auto';
    }}>
        Categorías
    </button>
    <Categories showCategories={showCategories} setShowCategories={setShowCategories} />
   </>
    );
};
