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
    }}
    onMouseEnter={() => {
        // pre loader de las categorias padre. Si el usuario ya hizo hover, no hace nada, si no, carga las categorias padre para que al hacer click se muestren instantaneamente.
        
    }}
    >
        Categorías
    </button>
    <Categories showCategories={showCategories} setShowCategories={setShowCategories} />
   </>
    );
};
