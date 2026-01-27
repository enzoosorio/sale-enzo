"use client";
import { Categories } from "@/types/categories";
import { SplitText } from "gsap/all";
import React, { useEffect, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useImagesCategoriesStore } from "@/store/imagesCategoriesStore";

interface IndividualCategoryProps {
  category: Categories;
  menuRef: React.RefObject<HTMLUListElement | null>;
  isAnimating: boolean;
  setIsAnimating: React.Dispatch<React.SetStateAction<boolean>>;
  categorySelected: Categories | null;
  setCategorySelected: React.Dispatch<React.SetStateAction<Categories | null>>;
}

export const IndividualCategory = ({
  category,
  menuRef,
  isAnimating,
  setIsAnimating,
  categorySelected,
  setCategorySelected,
}: IndividualCategoryProps) => {
  const [splitInstance, setSplitInstance] = useState<SplitText | null>(null);
  const [selectedWord, setSelectedWord] = useState<HTMLElement | null>(null);
  const {
    setExitImagesByCategory,
    setImagesByCategory,
    exitImagesByCategory,
  } = useImagesCategoriesStore();

  useGSAP(() => {
    gsap.set(".back-button", {
      zIndex: -1,
      userSelect: "none",
      cursor: "default",
      pointerEvents: "none",
    });

    if (categorySelected && categorySelected.name === category.name) {
      if (isAnimating) {
        // Revertir SplitText anterior si existe
        if (splitInstance) {
          splitInstance.revert();
        }

        // Crear nuevo SplitText para animación de salida
        const splittedText = SplitText.create(".no-animate", {
          type: "lines",
        });
        setSplitInstance(splittedText);

        let tl = gsap.timeline();

        tl.to(
          splittedText.lines,
          {
            y: -100,
            opacity: 0,
            stagger: 0.05,
            duration: 0.2,
            ease: "power2.in",
          },
          0
        );
        tl.to(
          ".individual-category",
          {
            zIndex: -1,
            userSelect: "none",
            cursor: "default",
            pointerEvents: "none",
            duration: 0.2,
            ease: "power2.in",
          },
          0.2
        );
        tl.to(
          ".p-tag",
          {
            cursor: "default",
            duration: 0.1,
          },
          0.2
        );
        tl.to(
          ".flechitas-container",
          {
            zIndex: -1,
            opacity: 0,
            userSelect: "none",
            cursor: "default",
            pointerEvents: "none",
            duration: 0.2,
            ease: "power2.in",
          },
          0.3
        );
        tl.to(
          ".infinite-menu-items",
          {
            x: "-100%",
            width: "390px",
            duration: 0.3,
            ease: "power2.in",
          },
          0.5
        );
        tl.to(
          ".aside-filters",
          {
            zIndex: 10,
            opacity: 1,
            ease: "power2.out",
          },
          0.6
        );
        tl.to(
          ".back-button",
          {
            zIndex: 10,
            userSelect: "auto",
            cursor: "pointer",
            pointerEvents: "auto",
            opacity: 1,
            ease: "power2.out",
          },
          0.6
        );
      } else {
        // Revertir SplitText anterior (esto restaura el DOM original)
        let tl = gsap.timeline();
        if (splitInstance) {
          tl.to(
            splitInstance.lines,
            {
              y: 0,
              opacity: 1,
              stagger: 0.05,
              duration: 0.2,
              ease: "power2.in",
              reversed: true,
            },
            0
          );
          setSplitInstance(null);
        }

        // Primero animar los containers
        tl.to(
          ".individual-category",
          {
            zIndex: 10,
            userSelect: "auto",
            cursor: "pointer",
            pointerEvents: "auto",
            duration: 0.2,
            ease: "power2.out",
          },
          0
        );
        tl.to(
          ".p-tag",
          {
            cursor: "pointer",
            duration: 0.1,
          },
          0.2
        );
        tl.to(
          ".flechitas-container",
          {
            zIndex: 10,
            opacity: 1,
            userSelect: "auto",
            cursor: "pointer",
            pointerEvents: "auto",
            duration: 0.2,
            ease: "power2.out",
          },
          0.6
        );
        tl.to(
          ".infinite-menu-items",
          {
            x: "0%",
            width: "100%",
            duration: 0.3,
            ease: "power2.out",
          },
          0.5
        );
        tl.to(
          ".back-button",
          {
            zIndex: -1,
            userSelect: "none",
            cursor: "default",
            pointerEvents: "none",
            opacity: 0,
          },
          0.2
        );
        tl.to(
          ".aside-filters",
          {
            zIndex: -1,
            opacity: 0,
          },
          0.2
        );

        selectedWord?.classList.add("no-animate");
        selectedWord?.classList.add("individual-category");
        setSelectedWord(null);
        setTimeout(() => {
          setCategorySelected(null);
        }, 300);
      }
    }
  }, [categorySelected, isAnimating]);

  return (
      <p
        onMouseEnter={() => {
          if(categorySelected) return;

          setTimeout(() => {
            if (exitImagesByCategory) {
              setExitImagesByCategory(false);
            }

            setImagesByCategory(category.referenceImages);
          }, 100);
        }}
        onMouseLeave={() => {
          setExitImagesByCategory(true);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsAnimating(true);
          setCategorySelected(category);
          setSelectedWord(e.currentTarget);
          e.currentTarget.classList.remove("no-animate");
          e.currentTarget.classList.remove("individual-category");
        }}
        onTouchEnd={(e) => {
          // Handle touch end for mobile devices
          e.stopPropagation();
          // Check if the parent menu is dragging, if not, it's a tap
          if (menuRef && !menuRef.current?.classList.contains("is-dragging")) {
            setCategorySelected(category);
          }
        }}
        className={`
          p-tag
          ${
          categorySelected?.name !== category.name
            ? " no-animate individual-category "
            : ""
        } font-nanum font-light text-5xl cursor-pointer text-center px-4 py-1 transition-all touch-manipulation`}
      >
        {category.name}
      </p>
  );
};
