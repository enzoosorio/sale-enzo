'use client';
import { WholeProductStructure } from "@/types/products/products";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/all";
import gsap from "gsap";
import { useCategoriesStore } from "@/store/categorySection";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface OverviewProductsHeroProps {
  products: WholeProductStructure[];
}

export const OverviewProductsHero = ({
  products,
}: OverviewProductsHeroProps) => {
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const mainElementRef = useRef<HTMLElement | null>(null);
  const { showCategories } = useCategoriesStore();

  useEffect(() => {
    const fetchUserMetadata = async () => {
      const supabase = createClient()
      const user = await supabase.auth.getUser()
      const metadata = user.data.user?.user_metadata
      console.log({metadata})
    };

    fetchUserMetadata();
  }, [])

    useGSAP(() => {

    const totalProductsHeight = document.querySelector(".products-wrapper")?.scrollHeight || 0;
    const viewportHeight = window.innerHeight;
    const distanceToMove = totalProductsHeight - viewportHeight;
    console.log({totalProductsHeight, viewportHeight, distanceToMove})
    
    // Background definitions
    const initialBackground = `
      linear-gradient(0.025deg, rgba(254, 252, 255, 0.6) 0%, rgba(248, 247, 244, 1) 100%),
      radial-gradient(300px 120px at 2% 20%, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0) 70%),
      radial-gradient(300px 120px at 98% 20%, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0) 70%)
    `;
    const finalBackground = `
      linear-gradient(0.025deg, rgba(214, 217, 223, 0.3) 0%, rgba(179, 180, 184, 0.6) 100%),
      radial-gradient(3000px 120px at 2% -2%, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 70%),
      radial-gradient(3000px 120px at 98% -2%, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0) 70%)
    `;
    
    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".main-home",
        start: "top top",
        end: `+=${distanceToMove + viewportHeight * 1.5}`,
        scrub: true,
        pin: true,
      },
    }); 

    tl.to(".mini-navbar-container",{
      paddingTop: "2rem",
      paddingBottom: "2.8rem",
      ease:"expo.out",
      duration: 0.3,
    },0);
    tl.to(".addons-wrapper",{
      y: '5rem',
      ease:"expo.out",
      duration: 0.3,
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
    <section className="section-overview w-full min-h-60  flex flex-col items-center justify-center py-8 gap-6">
      <div className="products-wrapper w-full max-w-5xl  overflow-hidden xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 py-8 flex flex-wrap gap-6 items-center justify-center">
        {products &&
          products.map((product, index) => {
            const paddedId = product.id.toString().padStart(2, "0");
            return (
              <div
                key={index}
                className="w-36 xl:w-40 aspect-auto bg-white"
              >
                <Link href={`/products/${product.id}`} className="flex flex-col items-center justify-center gap-2">
                <img
                  src={product.variant.main_img_url || '/images/products/polo-1.png'}
                  alt={product.name}
                  className="object-cover w-full h-full"
                />
                <span className="text-sm font-semibold">{paddedId}</span></Link>
              </div>
            );
          })}
      </div>
      {/* <Link href="/products" className="linkk font-prata">Ver más productos</Link> */}
    </section>
  );
};
