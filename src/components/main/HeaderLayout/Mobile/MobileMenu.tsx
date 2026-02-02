"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bag } from "@/components/reusable/svgs/Bag";
import { Favoritos } from "@/components/reusable/svgs/Favoritos";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/all";
import { CustomLinkMobile } from "./CustomLinkMobile";

interface MobileMenuProps {
  isOpened: boolean;
  onClose: () => void;
}

gsap.registerPlugin(useGSAP, SplitText);

export const MobileMenu = ({ isOpened, onClose }: MobileMenuProps) => {
  
  useGSAP(() => {
    let tl = gsap.timeline();

    const splittedText = SplitText.create(".mobile-menu-link", {
      type: "lines",
    });

    if (isOpened) {
      tl.to(
        ".navbar-mobile",
        { height: "100vh", duration: 0.5, ease: "power2.out" },
        0
      );

      tl.from(
        splittedText.lines,
        {
          opacity: 0,
          y: 100,
          stagger: 0.05,
          duration: 0.5,
          ease: "power2.out",
        },
        0.3
      );
    } else {
      tl.to(
        ".navbar-mobile",
        {
          height: "0vh",
          duration: 0.5,
          ease: "power2.in",
        },
        0
      );
    }
  }, [isOpened]);

  return (
    <section
      className="navbar-mobile cursor-auto fixed inset-0 w-full bg-off-white z-30 flex flex-col items-center justify-center overflow-hidden"
      style={{ height: "0vh" }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute cursor-pointer top-10 right-10 text-foreground text-4xl hover:opacity-70 transition-opacity z-50"
        aria-label="Cerrar menú"
      >
        ×
      </button>
      
      {/* Navigation links */}
      <nav className="flex flex-col items-center w-3/4 justify-center gap-8">
        <CustomLinkMobile 
        href="/home"
        onClose={onClose}
        >
          <p className="w-max mx-auto">
            Inicio
          </p>
        </CustomLinkMobile>
        
        <CustomLinkMobile
          href="#"
          onClose={onClose}
        >
          <p className="w-max mx-auto">
            Categorías
          </p>
        </CustomLinkMobile>

        <CustomLinkMobile
          href="#"
          onClose={onClose}
        >
          <p className="w-max mx-auto">
            Contacto
          </p>
        </CustomLinkMobile>

        {/* Favorites with icon */}
        <CustomLinkMobile
          href="#"
          onClose={onClose}
          auxId="favoritos0"
        >
         <div className="flex items-start justify-center mx-auto w-max gap-4">
           <Favoritos id="favoritos0" />
          <span>Favoritos</span>
         </div>
        </CustomLinkMobile>

        {/* Cart with icon */}
        <CustomLinkMobile
          href="#"
          onClose={onClose}
          auxId="carrito0"
        >
          <div className="flex items-start justify-center mx-auto w-max gap-4">
            <Bag />
            <span>Carrito</span>
          </div>
        </CustomLinkMobile>
      </nav>
    </section>
  );
};
