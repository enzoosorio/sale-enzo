"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { WholeProductStructure } from "@/types/products/products";
import { ProductGrid } from "./ProductGrid";
import { AsideFilters } from "./AsideFilters";
import { ProductsFastNav } from "./ProductsFastNav";

gsap.registerPlugin(useGSAP, Flip, ScrollTrigger);

interface ProductsLayoutProps {
    products: WholeProductStructure[];
    title: string;
}

export const ProductsLayout = ({ products, title }: ProductsLayoutProps) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [layoutActive, setLayoutActive] = useState(false);
    const gridRef = useRef<HTMLElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLElement>(null);

    const lockScroll = () => {
        document.body.style.overflow = "hidden";
    };
    const unlockScroll = () => {
        document.body.style.overflow = "";
    }

    useGSAP(() => {
        const activateLayout = () => {
            if (!containerRef.current || !gridRef.current || !sidebarRef.current) return;

            lockScroll();

            const state = Flip.getState([
                containerRef.current,
                gridRef.current,
                sidebarRef.current,
            ]);

            containerRef.current.classList.add("layout-active");

            Flip.from(state, {
                duration: 1,
                ease: "power3.inOut",
                absolute: true,
                nested: true,
                stagger: 0.01,
                onComplete: () => {
                    const tl = gsap.timeline();
                    tl.to(sidebarRef.current, {
                        opacity: 1,
                        duration: 0.1,
                    }, 0);
                    tl.to('.subcategory-title', {
                        color: "#fff",
                        duration: 0.35,
                    }, 0.05)
                    tl.to('.title-main', {
                        opacity: 0,
                        duration: 0.35,
                    }, 0.06)
                    tl.to('.overlay-filters', {
                        x: "-100%",
                        duration: 0.5,
                    }, 0.05)

                    unlockScroll();
                },
            })
        };

        const deactivateLayout = () => {
            if (!containerRef.current || !gridRef.current || !sidebarRef.current) return;

            lockScroll();
            const state = Flip.getState([
                containerRef.current,
                gridRef.current,
                sidebarRef.current,
            ]);

            containerRef.current.classList.remove("layout-active");

            Flip.from(state, {
                duration: 1,
                ease: "power3.inOut",
                absolute: true,
                nested: true,
                stagger: 0.01,
                onComplete: () => {
                    gsap.to('.fast-nav-wrapper', {
                    opacity: 1,
                    pointerEvents: 'auto',
                    duration: 0.1,
                })
                    unlockScroll();
                }
            });
        };

        if (layoutActive) {
            const tl = gsap.timeline();
            tl.to('.fast-nav-wrapper', {
                opacity: 0,
                pointerEvents: 'none',
                duration: 0.25,
            }, 0).then(() => {
                activateLayout();
            });
        } else {
            // making aside filters exit animation before deactivating layout
            const tl = gsap.timeline(
            );
            tl.to('.subcategory-title', {
                color: "#221C1C",
                duration: 0.1,
            }, 0)
                .to('.title-main', {
                    opacity: 1,
                    duration: 0.1,
                }, 0.05)
            tl.to('.overlay-filters', {
                x: "0%",
                duration: 0.5,
            }, 0)
            tl.to(sidebarRef.current, {
                opacity: 0,
                duration: 0.1,
            }, ">0.05").then(() => {
                deactivateLayout();
            });

        }

    }, [layoutActive]);


    return (
        <main className="main-products">
            <section className="products-section  w-full min-h-screen overflow-clip flex flex-col items-start justify-start gap-0 relative pb-20">    
                <div
                    ref={containerRef}
                    className={`wrapper-pf relative grid grid-cols-1 grid-rows-2 pb-32  w-screen gap-0`}
                >
                    <div className="absolute top-10 left-0 pl-8 translate-y-0 row-span-1">
                    <p className="font-prata text-sm  px-2 py-1 ">
                        Polos / Sweatshirts / Pants / Accessories
                    </p>
                </div>
                    <ProductsFastNav
                    containerRef={containerRef}
                    subcategories={[
                        {
                            href: 'polos',
                            name: 'POLOS'
                        },
                        {
                            href: 'sweatshirts',
                            name: 'SWEATSHIRTS'
                        },
                        {
                            href: 'pants',
                            name: 'PANTS'
                        },
                        {
                            href: 'accessories',
                            name: 'ACCESSORIES'
                        },
                    ]}
                    />
                    {/* SIDEBAR */}
                    <aside
                        ref={sidebarRef}
                        className="relative filters-wrapper 
                        overflow-y-auto px-4 py-3 text-white transition-colors"
                    >
                        <h1
                            className="subcategory-title pl-4 pt-7 font-prata text-6xl "
                        >
                            {title}
                        </h1>

                        <AsideFilters />
                        <div className="overlay-filters fixed inset-0 w-full h-screen bg-off-white" />
                    </aside>

                    {/* GRID */}
                    <ProductGrid ref={gridRef} products={products} />
                </div>
            </section>
            {/* filters button */}
            <button
                onClick={() => {
                    setLayoutActive(!layoutActive)
                }}
                className="filter-button fixed bottom-8 right-8 cursor-pointer bg-black/5 stroke 
            stroke-[rgba(181,179,179,0.6)] backdrop-blur-md shadow rounded-full p-3.5 w-16">
                <svg viewBox="0 0 32 32" fill="none" className="stroke-black" >
                    <g id="filters-svg">
                        <path id="Vector" d="M5.33301 6.66667H13.333M13.333 6.66667C13.333 8.13943 14.5269 9.33333 15.9997 9.33333C17.4725 9.33333 18.6663 8.13943 18.6663 6.66667M13.333 6.66667C13.333 5.19391 14.5269 4 15.9997 4C17.4725 4 18.6663 5.19391 18.6663 6.66667M18.6663 6.66667H26.6663M5.33301 16H21.333M21.333 16C21.333 17.4728 22.5269 18.6667 23.9997 18.6667C25.4725 18.6667 26.6663 17.4728 26.6663 16C26.6663 14.5272 25.4725 13.3333 23.9997 13.3333C22.5269 13.3333 21.333 14.5272 21.333 16ZM10.6663 25.3333H26.6663M10.6663 25.3333C10.6663 23.8605 9.47243 22.6667 7.99967 22.6667C6.52691 22.6667 5.33301 23.8605 5.33301 25.3333C5.33301 26.8061 6.52691 28 7.99967 28C9.47243 28 10.6663 26.8061 10.6663 25.3333Z" strokeWidth="1.5" strokeLinecap="round" />
                    </g>
                </svg>
            </button>
        </main>
    );
};
