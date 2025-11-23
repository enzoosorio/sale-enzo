'use client'

import { useEffect, useState } from "react";
import { Categories } from "./Categories";
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);
export const CategoriesButton = () => {

    const [showCategories, setShowCategories] = useState(false);
  
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
