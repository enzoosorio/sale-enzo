"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CloseButtonSVG, CloseButtonSVGAux, CloseButtonSVGOpen } from "@/components/reusable/svgs/CloseOpenSVG";
import { InfiniteScrollCategories } from "./InfiniteScrollCategories";
import { SplitText } from "gsap/all";
import { useImagesCategoriesStore } from "@/store/imagesCategoriesStore";
import { useCategoriesStore } from "@/store/categorySection";
import { getParentCategories } from "@/utils/filters";
import { Breadcrumbs } from "./Breadcrumbs/Breadcrumbs";
import { BlurEffect } from "@/components/reusable/svgs/BlurEffect";
import { BlurEffect2 } from "@/components/reusable/svgs/BlurEffect2";


gsap.registerPlugin(useGSAP, SplitText);

const initImagesPositions = [
  { id: "image1", top: "10%", left: "17%" },
  { id: "image2", top: "25%", left: "8%" },
  { id: "image3", top: "45%", left: "16%" },
  { id: "image4", top: "10%", left: "72%" },
  { id: "image5", top: "29%", left: "80%" },
  { id: "image6", top: "55%", left: "74%" },
];

// Strict state machine for animation flow
export type CategoryPhase = 
"PARENTS" |
"TO_SUB" | 
"SUBCATEGORIES" | 
"TO_ALL_FILTERS"|
"ALL_FILTERS" |
"TO_SUBCATEGORIES" |
"TO_PARENTS";

export const CategoriesPanel = () => {
  const { imagesByCategory, exitImagesByCategory, setImagesByCategory, setExitImagesByCategory } = useImagesCategoriesStore();
  const [phase, setPhase] = useState<CategoryPhase>("PARENTS");
  const { parentCategories, setParentCategories, setIsLoadingCategories, showCategories, setShowCategories } = useCategoriesStore();
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  useGSAP(() => {
    const section = document.querySelector(".categories-section");
    if (!section) return;

    const splittedText = SplitText.create(".individual-category", {
      type: "lines",
    });

    if (showCategories) {
      gsap.timeline()
        .set(section, {
          display: "flex",
        })
        .to(
          section,
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.5,
            ease: "power2.out",
          },
          0
        )
        .from(
          splittedText.lines,
          {
            opacity: 1,
            y: 100,
            stagger: 0.05,
            duration: 0.5,
            ease: "power2.out",
          },
          0.3
        );
    } else {
      gsap.timeline()
        .to(
          section,
          {
            clipPath: "inset(100% 0% 0% 0%)",
            duration: 0.5,
            ease: "power2.in",
          },
          0
        )
        .set(section, {
          display: "none",
        });
    }
  }, [showCategories]);

  useEffect(() => {
    // initial fetch of categories to show in the section
    const fetchCategories = async () => {
      // Solo cargar si no hay categorías ya cargadas
      if (parentCategories.length > 0) return;
      
      try {
        setIsLoadingCategories(true);
        const categories = await getParentCategories();
        setParentCategories(categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    
    fetchCategories();  
  }, [])

  // Bloquear scroll del body cuando las categorías están abiertas
  useEffect(() => {
    if (showCategories) {
      // Guardar posición actual del scroll
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restaurar posición del scroll
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
  }, [showCategories])

  const positions = ["20", "15", "10", "10", "15", "0"];

  useGSAP(() => {
    imagesByCategory.forEach((_, index) => {
      gsap.set(`.images-wrapper div:nth-child(${index + 1})`, {
        position: "absolute",
        top: initImagesPositions[index].top,
        left: initImagesPositions[index].left,
      });
     
      gsap.set(`.overlay-image-effect`, {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
      });
    });

    if (imagesByCategory.length !== 0 && !exitImagesByCategory){
      gsap.to(".overlay-image-effect", {
        y: "100%",
        duration: 1,
        ease: "power3.out",
      });
    } else if( exitImagesByCategory ) {
      gsap.to(".overlay-image-effect", {
        y: "0%",
        duration: 0.15,
        ease: "power3.in",
        onComplete: () => {
          setImagesByCategory([]);
          setExitImagesByCategory(false);
        }
      });
    }
  }, [imagesByCategory, exitImagesByCategory]);


  // NOW we are going to listen the escape key to close the categories section, this is a common UX pattern that users expect, and it will enhance the user experience by allowing them to quickly exit the categories view without having to click the close button. We will add an event listener for the 'keydown' event and check if the pressed key is 'Escape'. If it is, we will trigger the same function that is called when the close button is clicked.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if(!showCategories) return;
      if (e.key === "Escape") {
        console.log('escape')
        setShowCategories && setShowCategories(false);
        setExitImagesByCategory(true);
        setIsAnimating(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCategories, setShowCategories, setExitImagesByCategory, setIsAnimating]);

  return (
    <section
      className="categories-section cursor-auto fixed inset-0 z-50 w-full h-screen bg-off-white flex flex-col items-center justify-center overflow-hidden"
      style={{ 
        display: "none",
        clipPath: "inset(100% 0% 0% 0%)",
        // zIndex: 10,
        isolation: 'isolate',
      }}
    >
      <InfiniteScrollCategories
        isAnimating={isAnimating}
        setIsAnimating={setIsAnimating}
        showCategories={showCategories}
        phase={phase}
        setPhase={setPhase}
      />
      {/* boton de cerrar el section */}
      <button
        className={`w-12 h-12 close-categories-button border-[0.5px] p-3.5 border-black flex items-center justify-center rounded-full 
          absolute 
          top-12 right-[10%] 
          z-50 cursor-pointer `}
        onClick={() => {
          // setting showCategories to false is handled in the parent component (HeaderLayout) through the setShowCategories prop, so we just need to call it here.
          
          setShowCategories && setShowCategories(false);
          setExitImagesByCategory(true);
          setIsAnimating(false);

          if(phase === "SUBCATEGORIES" || phase === "ALL_FILTERS") {
            // we must also navigate to /products with all the search params included.
            const searchParams = new URLSearchParams(window.location.search);
            const allSearchParams = searchParams.toString();
            window.history.pushState({}, '', `/products?${allSearchParams}`);
          }

        }}
      >
        <CloseButtonSVG className="w-7 h-7 stroke hover:stroke-2 transition-transform hover:scale-105" />
        <CloseButtonSVGOpen className="absolute top-0 left-0 w-7 h-7 pointer-events-none opacity-0" />
        <CloseButtonSVGAux className="absolute top-0 left-0 w-7 h-7 pointer-events-none opacity-0" />
      </button>

      {/* div para mostrar las imagenes pertenecientes al actual individual category que se encuentra en hover. */}
      <div className="images-wrapper fixed inset-0 z-10 select-none pointer-events-none bg-amber-0 w-full h-screen">
        {imagesByCategory.map((image, index) => (
          <div
            className="image-container h-max w-max overflow-hidden bg-amber-400"
            key={index}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="image-hover h-full w-full object-cover transition-all"
              style={{ zIndex: positions[index] }}
            />
            <div className="overlay-image-effect bg-off-white" />
          </div>
        ))}
      </div>
      {/* Breadcrumbs */}
        <Breadcrumbs/>
      {/* blur effect when loading */}
      <BlurEffect/> 
      <BlurEffect2/> 
    </section>
  );
};
