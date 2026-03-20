"use client";
import { OverviewProductsHero } from "@/components/main/OverviewProductsHero";
import { SuperBarraBusqueda } from "@/components/reusable/CTA/SuperBarraBusqueda";
import { products } from "@/lib/products";
import { useCategoriesStore } from "@/store/categorySection";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger, Flip } from "gsap/all";
import gsap from "gsap";
import { ReactLenis, useLenis } from "lenis/react";
import { useEffect } from "react";

// Background definitions
  export const initialBackground = `
      linear-gradient(0.025deg, rgba(254, 252, 255, 0.6) 0%, rgba(248, 247, 244, 1) 100%),
      radial-gradient(300px 120px at 2% 20%, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0) 70%),
      radial-gradient(300px 120px at 98% 20%, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0) 70%)
    `;
  export const finalBackground = `
      linear-gradient(0.025deg, rgba(214, 217, 223, 0.3) 0%, rgba(179, 180, 184, 0.6) 100%),
      radial-gradient(3000px 120px at 2% -2%, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 70%),
      radial-gradient(3000px 120px at 98% -2%, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 70%)
    `;

gsap.registerPlugin(useGSAP, ScrollTrigger, Flip);

export default function Home() {
  const { showCategories } = useCategoriesStore();
  const lenis = useLenis();

  // Pausar/reanudar Lenis cuando se abre/cierra el menú de categorías
  useEffect(() => {
    if (lenis) {
      if (showCategories) {
        lenis.stop();
      } else {
        lenis.start();
      }
    }
  }, [showCategories, lenis]);


    useGSAP(() => {

    const totalProductsHeight = document.querySelector(".products-wrapper")?.scrollHeight || 0;
    const viewportHeight = window.innerHeight;
    const distanceToMove = totalProductsHeight - viewportHeight;
    console.log({totalProductsHeight, viewportHeight, distanceToMove})
  
    const stateForAddons = Flip.getState(".addons-wrapper");
    
    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".main-home",
        start: "top top",
        end: `+=${distanceToMove + viewportHeight * 1.5}`,
        scrub: true,
        pin: '.mini-navbar-container',
        pinSpacing: false,
      },
    }); 

    tl.to(".mini-navbar-container",{
      paddingTop: "2rem",
      paddingBottom: "2.1rem",
      ease:"expo.out",
      duration: 0.3,
    },0);
    tl.to(".super-barra-busqueda",{
      border: "1px solid rgba(0,0,0,0.9)",
      ease:"expo.out",
      duration: 0.3,
    },0);
    tl.to(".addons-wrapper",{
      y: '6rem',
      ease:"expo.out",
      duration: 0.1,
    },0.025);

    tl.fromTo(".mini-navbar-container", 
      {
        background: initialBackground,
      },
      {
        background: finalBackground,
        //adding backdrop filter:
        backdropFilter: "blur(10px)",
        
        ease: "elastic.out(1,0.75)",
        duration: 0.3,
      },
      0
    );

    tl.to(".products-wrapper", 
      { y: -(distanceToMove + (viewportHeight * 1.2)), ease: "none", duration: 1 },
      0);

  }, [])

  return (
    <>
      <ReactLenis root />
      <main className="main-home relative z-0">
        {/* <div className="h-6 "/> */}
        <div className="relative mini-navbar-container bg-off-white  z-20 w-full flex pt-20 pb-6 items-center justify-center">
          {/* filters & Sillye for overscrolling */}
        <div className="addons-wrapper absolute -top-12 right-20 z-30  flex items-center justify-center gap-20">
          {/* filters svg */}

          <button className="bg-white border border-black p-1 cursor-pointer ">
            <svg
              width="30"
              height="30"
              viewBox="0 0 32 32"
              fill="none"
              className="bg"
            >
              <g id="filters-svg">
                <path
                  id="Vector"
                  d="M5.33325 6.66667H13.3333M13.3333 6.66667C13.3333 8.13943 14.5271 9.33333 15.9999 9.33333C17.4727 9.33333 18.6666 8.13943 18.6666 6.66667M13.3333 6.66667C13.3333 5.19391 14.5271 4 15.9999 4C17.4727 4 18.6666 5.19391 18.6666 6.66667M18.6666 6.66667H26.6666M5.33325 16H21.3333M21.3333 16C21.3333 17.4728 22.5271 18.6667 23.9999 18.6667C25.4727 18.6667 26.6666 17.4728 26.6666 16C26.6666 14.5272 25.4727 13.3333 23.9999 13.3333C22.5271 13.3333 21.3333 14.5272 21.3333 16ZM10.6666 25.3333H26.6666M10.6666 25.3333C10.6666 23.8605 9.47268 22.6667 7.99992 22.6667C6.52716 22.6667 5.33325 23.8605 5.33325 25.3333C5.33325 26.8061 6.52716 28 7.99992 28C9.47268 28 10.6666 26.8061 10.6666 25.3333Z"
                  stroke="black"
                  strokeLinecap="round"
                />
              </g>
            </svg>
          </button>
          {/* sillye img TODO: png to svg */}
          <div className="cursor-pointer rounded-xl">
            <img
              src="/images/syllie/sillye-head-idle.png"
              alt="Sillye Head"
              className="w-full h-full"
            />
          </div>
        </div>
          <SuperBarraBusqueda />
        </div>
        {/* ayuda para el espaciado respecto al SuperBarraBusqueda que ahora es absoluto. */}
        <div className="h-5 " />
        <OverviewProductsHero products={products} />
      </main>
    </>
  );
}
