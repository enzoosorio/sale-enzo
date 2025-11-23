"use client";

import React from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CloseButtonSVG } from "@/components/reusable/svgs/CloseButtonSVG";
import { InfiniteScrollCategories } from "./InfiniteScrollCategories";
import { SplitText } from "gsap/all";
import { useImagesCategoriesStore } from "@/store/imagesCategoriesStore";

interface CategoriesProps {
  showCategories?: boolean;
  setShowCategories?: React.Dispatch<React.SetStateAction<boolean>>;
}

gsap.registerPlugin(useGSAP, SplitText);

const initImagesPositions = [
  { id: "image1", top: "10%", left: "17%" },
  { id: "image2", top: "25%", left: "8%" },
  { id: "image3", top: "45%", left: "16%" },
  { id: "image4", top: "10%", left: "72%" },
  { id: "image5", top: "29%", left: "80%" },
  { id: "image6", top: "55%", left: "74%" },
];

export const Categories = ({
  setShowCategories,
  showCategories,
}: CategoriesProps) => {
  const { imagesByCategory, exitImagesByCategory, setImagesByCategory, setExitImagesByCategory } = useImagesCategoriesStore();
  
  useGSAP(() => {
    let tl = gsap.timeline();

    const splittedText = SplitText.create(".individual-category", {
      type: "lines",
    });

    if (showCategories) {
      tl.to(
        ".categories-section",
        { height: "100vh", duration: 0.5, ease: "power2.out" },
        0
      );

      tl.from(
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
      tl.to(
        ".categories-section",
        {
          height: "0vh",
          duration: 0.5,
          ease: "power2.in",
        },
        0
      );
    }
  }, [showCategories]);


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

  return (
    <section
      className="categories-section cursor-auto fixed inset-0 w-full bg-off-white z-20 flex flex-col items-center justify-center overflow-hidden"
      style={{ height: "0vh" }}
    >
      <InfiniteScrollCategories />
      {/* boton de cerrar el section */}
      <button
        className=" absolute top-[10%] right-[10%] cursor-pointer "
        onClick={() => {
          setShowCategories && setShowCategories(false);
          document.body.style.overflow = "auto";
        }}
      >
        <CloseButtonSVG className="w-7 h-7 hover:rotate-90 transition-transform hover:scale-105" />
      </button>

      {/* div para mostrar las imagenes pertenecientes al actual individual category que se encuentra en hover. */}
      <div className="images-wrapper fixed inset-0 z-10 select-none pointer-events-none bg-amber-0 w-full h-full">
        {imagesByCategory.map((image, index) => (
          <div
            className="image-container h-max w-max bg-amber-400"
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
    </section>
  );
};
