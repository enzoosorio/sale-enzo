"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CloseButtonSVG, OpenButtonSVG } from "@/components/reusable/svgs/CloseOpenSVG";
import { InfiniteScrollCategories } from "./InfiniteScrollCategories";
import { SplitText } from "gsap/all";
import { useImagesCategoriesStore } from "@/store/imagesCategoriesStore";
import { useCategoriesStore } from "@/store/categorySection";
import { getParentCategories } from "@/utils/filters";
import { Breadcrumbs } from "./Breadcrumbs/Breadcrumbs";
import { BlurEffect } from "@/components/reusable/svgs/BlurEffect";
import { BlurEffect2 } from "@/components/reusable/svgs/BlurEffect2";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BolitaEfectoClick } from "@/components/reusable/BolitaEfectoClick";


gsap.registerPlugin(useGSAP, SplitText);

const initImagesPositions = [
  { id: "image1", top: "10%", left: "17%" },
  { id: "image2", top: "25%", left: "8%" },
  { id: "image3", top: "45%", left: "16%" },
  { id: "image4", top: "10%", left: "72%" },
  { id: "image5", top: "29%", left: "80%" },
  { id: "image6", top: "55%", left: "74%" },
];

const OPEN_SVG_PATH_OFFSET = 47.94404602050781;


// Strict state machine for animation flow
export type CategoryPhase =
  "PARENTS" |
  "TO_SUB" |
  "SUBCATEGORIES" |
  "TO_ALL_FILTERS" |
  "ALL_FILTERS" |
  "TO_SUBCATEGORIES" |
  "TO_PARENTS";

export const CategoriesPanel = () => {
  const { imagesByCategory, exitImagesByCategory, setImagesByCategory, setExitImagesByCategory } = useImagesCategoriesStore();
  const [phase, setPhase] = useState<CategoryPhase>("PARENTS");
  const { parentCategories, setParentCategories, setIsLoadingCategories, showCategories, setShowCategories } = useCategoriesStore();
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [linkToShopWSearch, setLinkToShopWSearch] = useState<string>("");
  const lockedScrollYRef = useRef<number | null>(null);

  const searchParams = useSearchParams();

  const lockBodyScroll = () => {
    if (lockedScrollYRef.current !== null) return;

    const scrollY = window.scrollY;
    lockedScrollYRef.current = scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
  };

  const unlockBodyScroll = () => {
    const lockedScrollY = lockedScrollYRef.current ?? 0;

    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";

    window.scrollTo(0, lockedScrollY);
    lockedScrollYRef.current = null;
  };

  const closePanel = () => {
    setShowCategories && setShowCategories(false);
    setExitImagesByCategory(true);
    setIsAnimating(false);
    unlockBodyScroll();
  };

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
            zIndex: 70,
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

    const setDashArray = () => {
      gsap.set("#close-svg-open", {
        strokeDasharray: OPEN_SVG_PATH_OFFSET,
        strokeDashoffset: OPEN_SVG_PATH_OFFSET,
      });
      gsap.set(".wrapper-dasharray", {
        right: `9.8rem`,
        pointerEvents: 'none',
        // opacity: 0,
      });
    }

    fetchCategories();
    setDashArray();
  }, [])

  // Bloquear scroll del body cuando las categorías están abiertas
  useEffect(() => {
    if (showCategories) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
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

    if (imagesByCategory.length !== 0 && !exitImagesByCategory) {
      gsap.to(".overlay-image-effect", {
        y: "100%",
        duration: 1,
        ease: "power3.out",
      });
    } else if (exitImagesByCategory) {
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
      if (!showCategories) return;
      if (e.key === "Escape") {
        console.log('escape')
        closePanel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCategories, setShowCategories, setExitImagesByCategory, setIsAnimating]);

  useEffect(() => {
    const wholeSearch = searchParams.toString();
    const link = wholeSearch ? `/products?${wholeSearch}` : "/products";
    setLinkToShopWSearch(link);

  }, [searchParams])

  return (
    <section
      className="categories-section cursor-auto fixed inset-0 z-60 w-full h-screen bg-off-white flex flex-col items-center justify-center overflow-hidden"
      style={{
        display: "none",
        clipPath: "inset(100% 0% 0% 0%)",
        zIndex: 80,
      }}
    >
      <InfiniteScrollCategories
        isAnimating={isAnimating}
        setIsAnimating={setIsAnimating}
        showCategories={showCategories}
        phase={phase}
        setPhase={setPhase}
        openSVGPathOffset={OPEN_SVG_PATH_OFFSET}
      />

      {/* wrapper acciones estilo open - close */}
      {/* RIGHT DE ACA MANDA LA POSICION DEL CONTAINER */}
      <div className={`container-both-actions border
        w-16 h-16 border-black rounded-full 
        z-50 absolute right-44 top-12 flex 
        items-center justify-center`}>
        {/* boton de cerrar el section */}
        {/* TODO: AL MOMENTO DE CERRAR, RESETEAR LAS URLSEARCHPARAMS. vamos a ver que tan bien es esto*/}
        <button
          className={` relative w-12 h-12 close-categories-button group p-2 flex items-center justify-center rounded-full cursor-pointer `}
          onClick={() => {
            closePanel();
          }}
        >
          <BolitaEfectoClick />
          <CloseButtonSVG className="w-7 h-7 stroke group-hover:stroke-2 transition-transform group-hover:scale-105" />
        </button>
      </div>
      {/* RIGHT DE ACA MANDA LA POSICION DE LA FLECHA INICIAL (EL MOVIMIENTO ANIMADO ES UN "IDA Y VUELTA") */}
      <div className={`wrapper-dasharray z-50 absolute 
          top-12 right-20 w-max h-16 
          flex items-center justify-center`}>
        <Link
          href={linkToShopWSearch}
          onClick={() => {
            closePanel();
          }}
          className="relative group w-12 h-12 p-2 flex items-center justify-center rounded-full"
        >
          <BolitaEfectoClick />
          <OpenButtonSVG className="w-7 h-7 stroke group-hover:stroke-2 transition-transform group-hover:scale-105" />
        </Link>
      </div>
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
      <Breadcrumbs />
      {/* blur effect when loading */}
      <BlurEffect />
      <BlurEffect2 />
    </section>
  );
};
