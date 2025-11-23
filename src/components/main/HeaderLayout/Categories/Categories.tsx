"use client";

import React from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CloseButtonSVG } from "@/components/reusable/svgs/CloseButtonSVG";
import { InfiniteScrollCategories } from "./InfiniteScrollCategories";
import { SplitText } from "gsap/all";
import { BackButton } from "@/components/reusable/svgs/BackButton";

interface CategoriesProps {
  showCategories?: boolean;
  setShowCategories?: React.Dispatch<React.SetStateAction<boolean>>;
}

gsap.registerPlugin(useGSAP, SplitText);

export const Categories = ({
  setShowCategories,
  showCategories,
}: CategoriesProps) => {
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
    </section>
  );
};
