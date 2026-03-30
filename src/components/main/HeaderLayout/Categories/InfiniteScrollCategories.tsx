import gsap from "gsap";
import React, { useEffect, useMemo, useRef, useState, useCallback} from "react";
import { MorphSVGPlugin, SplitText } from "gsap/all";
import { Categories } from "@/types/products/old_category/categories";
import { IndividualCategory } from "./IndividualCategory";
import { BackButton } from "@/components/reusable/svgs/BackButton";
import { AsideCategoriesFilter } from "./AsideCategories/AsideProduct&Filters";
import { useCategoriesStore } from "@/store/categorySection";
import { ProductCategory } from "@/schema/categorySchema";
import { getSubcategoriesByParentId } from "@/utils/filters";
import { useInfiniteVerticalScroll } from "@/hooks/useInfiniteVerticalScroll";
import { CategoryPhase } from "./CategoriesPanel";
import { useRouter, useSearchParams } from "next/navigation";
import { createBlurAnimation } from "@/utils/gsap/blur";

gsap.registerPlugin(MorphSVGPlugin, SplitText);

interface InfiniteScrollCategoriesProps {
  isAnimating: boolean;
  setIsAnimating: React.Dispatch<React.SetStateAction<boolean>>;
  showCategories?: boolean;
  phase: CategoryPhase;
  setPhase: React.Dispatch<React.SetStateAction<CategoryPhase>>;
  openSVGPathOffset: number;
}

export const InfiniteScrollCategories = ({ isAnimating, setIsAnimating, showCategories, phase, setPhase, openSVGPathOffset   }: InfiniteScrollCategoriesProps) => {
  // Dual refs for two separate lists (both always mounted)
  const parentsMenuRef = useRef<HTMLUListElement>(null);
  const subMenuRef = useRef<HTMLUListElement>(null);
  const parentsItemsRef = useRef<(HTMLLIElement | null)[]>([]);
  const subItemsRef = useRef<(HTMLLIElement | null)[]>([]);
  
  // SplitText refs for proper cleanup
  const parentsSplitRef = useRef<SplitText | null>(null);
  const subSplitRef = useRef<SplitText | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [speedDrag, setSpeedDrag] = useState(1.2);
  const [categorySelected, setCategorySelected] = useState<Categories | null>(null);
  const [subcategories, setSubcategories] = useState<Categories[]>([]);
  const { parentCategories } = useCategoriesStore();

  // URL navigation
  const router = useRouter();
  const searchParams = useSearchParams();

  // Adapt ProductCategory[] from DB to Categories[] format expected by UI
  const categories: Categories[] = useMemo(() => {
    if (parentCategories.length === 0) {
      return [];
    }
    return parentCategories.map((cat: ProductCategory) => ({
      id: cat.id,
      name: cat.name.toUpperCase(),
      slug: cat.slug,
      // referenceImages is optional, so we don't include it if not available
    }));
  }, [parentCategories]);

  // Use infinite scroll hook for parents list
  useInfiniteVerticalScroll({
    menuRef: parentsMenuRef,
    itemsRef: parentsItemsRef,
    itemCount: categories.length,
    speedDrag,
    isActive:
    showCategories &&
    phase === "PARENTS" &&
    categories.length > 0,
  });

  const isSubScrollReady =
  showCategories &&
  phase === "SUBCATEGORIES" &&
  subcategories.length > 0 &&
  subItemsRef.current.filter(Boolean).length === subcategories.length

  // Use infinite scroll hook for subcategories list
 useInfiniteVerticalScroll({
  menuRef: subMenuRef,
  itemsRef: subItemsRef,
  itemCount: subcategories.length,
  speedDrag,
  isActive: isSubScrollReady,
});

// Reset subcategory refs when subcategories change to avoid stale refs
useEffect(() => {
  subItemsRef.current = [];
}, [subcategories]);


  // Handle parent category click
  const handleParentClick = useCallback((category: Categories) => {
    if (phase !== "PARENTS") return;
    
    // Ensure slug exists before proceeding
    if (!category.slug) {
      console.error("Category missing slug:", category);
      return;
    }
    
    setPhase("TO_SUB");
    setIsAnimating(true);
    setCategorySelected(category);
    
    // Write to URL instead of Zustand
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", category.slug);
    params.delete("subcategory"); // Remove subcategory when selecting new category
    
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [phase, setIsAnimating, setPhase, router, searchParams]);

  // Handle subcategory click - triggers transition to ALL_FILTERS
  const handleSubcategoryClick = useCallback((subcat: Categories) => {
    if (phase !== "SUBCATEGORIES") return;
    
    // Ensure slug exists before proceeding
    if (!subcat.slug) {
      console.error("Subcategory missing slug:", subcat);
      return;
    }
    
    // Write to URL instead of Zustand
    const params = new URLSearchParams(searchParams.toString());
    params.set("subcategory", subcat.slug);
    
    router.replace(`?${params.toString()}`, { scroll: false });
    
    // Trigger transition to filters
    setPhase("TO_ALL_FILTERS");
    setIsAnimating(true);
  }, [phase, setPhase, setIsAnimating, router, searchParams]);

  // Fetch subcategories when transitioning to subcategories
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (categorySelected && (phase !== 'PARENTS' && phase !== 'TO_PARENTS')) {
        try {
          const fetchedSubcategories = await getSubcategoriesByParentId(categorySelected.id);
          const formattedSubcategories: Categories[] = fetchedSubcategories.map((sub: ProductCategory) => ({
            id: sub.id,
            name: sub.name.toUpperCase(),
            slug: sub.slug,
          }));
          setSubcategories(formattedSubcategories);
        } catch (error) {
          console.error("Error fetching subcategories:", error);
          setSubcategories([]);
          // Reset on error
          setPhase("PARENTS");
          setIsAnimating(false);
          setCategorySelected(null);
        }
      }
    };
    
    fetchSubcategories();
  }, [categorySelected, phase]);


  useEffect(() => {
    console.log({phase})
  if (phase === "SUBCATEGORIES") {
    setTimeout(() => {
      console.log('[INIT] Subcategories layout complete');
    }, 500); // Wait for animations
  }
}, [phase]);

  // Parent exit animation (TO_SUB phase)
  useEffect(() => {
    // if (phase === "TO_SUB" && subcategories.length > 0 && parentsMenuRef.current) {
    if (phase === "TO_SUB" && parentsMenuRef.current) {
      // Revert previous SplitText if exists
      if (parentsSplitRef.current) {
        parentsSplitRef.current.revert();
        parentsSplitRef.current = null;
      }

      gsap.to(".back-button", {
        pointerEvents: "none",
      });

      const animateBlurred = createBlurAnimation(".blurred", ".blurred-2");

      const tl = gsap.timeline({
        onComplete: () => {
          setPhase("SUBCATEGORIES");
          gsap.to(".back-button", {
            pointerEvents: "auto",
          });          
        },
        onUpdate: () => {
          animateBlurred(tl.progress());
      }
      });

      // SplitText exit animation for parents
      const parentItems = parentsMenuRef.current.querySelectorAll(".individual-category");
      if (parentItems.length > 0) {
        parentsSplitRef.current = SplitText.create(parentItems, {
          type: "lines",
        });

        tl.to(parentsSplitRef.current.lines, {
          y: -80,
          opacity: 0,
          stagger: 0.04,
          duration: 0.5,
          ease: "power2.in",
        }, 0);
      }

      // Hide parents container after text animates out
      tl.to(parentsMenuRef.current, {
        zIndex: 0,
        opacity: 0,
        pointerEvents: "none",
        duration: 0.1,
      }, 0.4);

      // Show back button
      tl.to(".back-button", {
        opacity: 1,
        zIndex: 10,
        pointerEvents: "auto",
        duration: 0.3,
        ease: "power2.out",
      }, 0.4);
    }
  // }, [phase, subcategories]);
  }, [phase, setPhase]);

  // Subcategory entry animation (SUBCATEGORIES phase)
  useEffect(() => {
    if (phase === "SUBCATEGORIES" && subcategories.length > 0 && subMenuRef.current && parentsMenuRef.current) {
      // Force layout calculation
      subMenuRef.current.getBoundingClientRect();
      subItemsRef.current.forEach(item => item?.getBoundingClientRect());

      //forcing parents to be hidden because if we receive searchParams directly in the URL, we skip the parent exit animation, so we need to make sure they are hidden before animating the subcategories in.
      gsap.set(parentsMenuRef.current, {
        opacity: 0,
        pointerEvents: "none",
        zIndex: 0,
      })

      //forcing back button to be visible in case we come directly with URL params to the subcategories phase, so we skip the parent exit animation where the back button appears.
      gsap.set(".back-button", {
        opacity: 1,
        zIndex: 10,
        pointerEvents: "auto",
      });

      // Set container visible
      gsap.set(subMenuRef.current, {
        zIndex: 10,
        opacity: 1,
        pointerEvents: "auto",
      });

      // Revert previous SplitText if exists
      if (subSplitRef.current) {
        subSplitRef.current.revert();
        subSplitRef.current = null;
      }

      // Wait one frame for layout
      requestAnimationFrame(() => {
        const subcatItems = subMenuRef.current?.querySelectorAll(".individual-category");
        if (subcatItems && subcatItems.length > 0) {
          // Reset baseline transforms
          gsap.set(subcatItems, { y: 0, opacity: 1 });

          subSplitRef.current = SplitText.create(subcatItems, {
            type: "lines",
          });

          gsap.from(subSplitRef.current.lines, {
            opacity: 0,
            y: 100,
            stagger: 0.05,
            duration: 0.6,
            ease: "power2.out",
          
          });
        }
      });
      // subcategories are fetched but parent exit animation hasn't completed yet, so we wait for the layout to stabilize before initializing the scroll.
      // I'd hide the subcategories container until the layout is ready to avoid any flickering or mispositioning during the transition.
    }else if (phase !== "SUBCATEGORIES" && subcategories.length > 0 && subMenuRef.current && parentsMenuRef.current) {
        // Hide subcategories container until next time we enter this phase
        gsap.set(subMenuRef.current, {
          opacity: 0,
          zIndex: 0,
          pointerEvents: "none",
        });
    }
  }, [phase, subcategories]);

  // Handle back button click - URL-driven navigation with transition animations
  const handleBackClick = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const hasSubcategory = params.has("subcategory");
    const hasCategory = params.has("category");

    if (hasSubcategory) {
      // Back from ALL_FILTERS to SUBCATEGORIES
      setPhase("TO_SUBCATEGORIES");
      setIsAnimating(true);
      params.delete("subcategory");
      params.delete("tag");
      params.delete("color");
      params.delete("size");
      params.delete("brand");
      params.delete("gender");
      params.delete("fit");
      params.delete("minPrice");
      params.delete("maxPrice");
      router.replace(`?${params.toString()}`, { scroll: false });
    } else if (hasCategory) {
      // Back from SUBCATEGORIES to PARENTS
      setPhase("TO_PARENTS");
      params.delete("category");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [router, searchParams, setPhase, setIsAnimating]);

  // Subcategory exit animation to ALL_FILTERS (TO_ALL_FILTERS phase)
  useEffect(() => {
    if (phase === "TO_ALL_FILTERS" && subMenuRef.current) {
      // Revert previous SplitText if exists
      if (subSplitRef.current) {
        subSplitRef.current.revert();
        subSplitRef.current = null;
      }

      gsap.to(".back-button", {
        pointerEvents: "none",
        opacity: 0.3,
      });

      const animateBlurred = createBlurAnimation(".blurred", ".blurred-2");

      const tl = gsap.timeline({
        onComplete: () => {
          setPhase("ALL_FILTERS");
          gsap.to(".back-button", {
          pointerEvents: "auto",
          opacity: 1,
          left: '5%'
        });
        },
        onUpdate: () => {
          animateBlurred(tl.progress());
      }
      });

      // SplitText exit animation for subcategories
      const subItems = subMenuRef.current.querySelectorAll(".individual-category");
      if (subItems.length > 0) {
        subSplitRef.current = SplitText.create(subItems, {
          type: "lines",
        });

        tl.to(subSplitRef.current.lines, {
          y: -80,
          opacity: 0,
          stagger: 0.04,
          duration: 0.5,
          ease: "power2.in",
        }, 0);
      }

      // Hide subcategories container
      tl.to(subMenuRef.current, {
        zIndex: 0,
        pointerEvents: "none",
        duration: 0.1,
      }, 0.4);

    }else if(phase !== "ALL_FILTERS" && subMenuRef.current) {
      //Ensure categories are hidden when not in transition to filters
      gsap.set(parentsMenuRef.current, {
        opacity: 0,
        zIndex: 0,
        pointerEvents: "none",
      })

      // Ensure subcategories are hidden when not in transition to filters
      gsap.set(subMenuRef.current, {
        opacity: 0,
        zIndex: 0,
        pointerEvents: "none",
      });
      
    }
  }, [phase, setPhase]);

  // Aside filters entry animation (ALL_FILTERS phase)
  useEffect(() => {
    const asideElement = document.querySelector(".aside-filters");
    if (!asideElement) return; 

    if (phase === "ALL_FILTERS") {

      //forcing parents elements to be hidden in case we come directly with URL params to the ALL_FILTERS phase, so we skip the parent and subcategory exit animations, which are the ones that hide the parents and subcategories containers.
      gsap.set(parentsMenuRef.current, {
      opacity: 0,
      zIndex: 0,
      pointerEvents: "none",
    });

      const tl = gsap.timeline()
        .to(asideElement, {
          opacity: 1,
          x: 0,
          zIndex: 10,
          pointerEvents: "auto",
          duration: 0.25,
          ease: "power2.out",
          onComplete: () => {
            setIsAnimating(false);
          },
        }, 0);
        tl.to('.card-filters-panel', {
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.35,
        }, '>');

      // Keep back button visible for returning to subcategories
      gsap.to(".back-button", {
        opacity: 1,
        zIndex: 70,
        pointerEvents: "auto",
        duration: 0.3,
        ease: "power2.out",
      });
    }
  }, [phase, setIsAnimating]);

  // Aside exit + subcategories re-entry (TO_SUBCATEGORIES phase)
  useEffect(() => {
    const asideElement = document.querySelector(".aside-filters");
    if (phase === "TO_SUBCATEGORIES" && asideElement && subMenuRef.current) {

      gsap.to(".back-button", {
        pointerEvents: "none",
        opacity: 0.3,
      });

      const animateBlurred = createBlurAnimation(".blurred", ".blurred-2");

      const tl = gsap.timeline({
        onComplete: () => {
          setPhase("SUBCATEGORIES");
          setIsAnimating(false);
          gsap.to(".back-button", {
          pointerEvents: "auto",
          opacity: 1,
          left: '25%'
        });

        },
        onUpdate: () => {
          animateBlurred(tl.progress());
      }
      });

      // Animate aside out
      tl.to('.card-filters-panel', {
        y: '100%',
        duration: 0.25,
        ease: "power2.in",
        stagger: 0.25,
      }, 0);
      tl.to(asideElement, {
        opacity: 0,
        x: 50,
        zIndex: -10,
        pointerEvents: "none",
        duration: 0.4,
        ease: "power2.in",
      }, "<0.2");

      // Show subcategories container
      tl.set(subMenuRef.current, {
        zIndex: 10,
        pointerEvents: "auto",
      }, 0.5);

      // Re-animate subcategories in
      const subcatItems = subMenuRef.current.querySelectorAll(".individual-category");
      if (subcatItems && subcatItems.length > 0) {
        if (subSplitRef.current) {
          subSplitRef.current.revert();
          subSplitRef.current = null;
        }

        gsap.set(subcatItems, { y: 0, opacity: 1 });

        subSplitRef.current = SplitText.create(subcatItems, {
          type: "lines",
        });

        tl.from(subSplitRef.current.lines, {
          opacity: 0,
          y: 100,
          stagger: 0.05,
          duration: 0.6,
          ease: "power2.out",
        }, 0.5);
      }
    }
  }, [phase, setIsAnimating, setPhase]);


  // Subcategory exit animation to PARENTS (TO_PARENTS phase)
  useEffect(() => {
    if (phase === "TO_PARENTS" && subMenuRef.current) {
      // Revert previous SplitText if exists
      if (subSplitRef.current) {
        subSplitRef.current.revert();
        subSplitRef.current = null;
      }

      gsap.to(".back-button", {
        pointerEvents: "none",
        opacity: 0.3,
      });


      const animateBlurred = createBlurAnimation(".blurred", ".blurred-2");
      const tl = gsap.timeline({
        onComplete: () => {
          setSubcategories([]);
          setCategorySelected(null);
          setPhase("PARENTS");
          setIsAnimating(false);
          gsap.to(".back-button", {
            pointerEvents: "none",
            opacity: 0,
          });
        },
        onUpdate: () => {
          animateBlurred(tl.progress());
      }
      });

      // SplitText exit animation for subcategories
      const subItems = subMenuRef.current.querySelectorAll(".individual-category");
      if (subItems.length > 0) {
        subSplitRef.current = SplitText.create(subItems, {
          type: "lines",
        });

        tl.to(subSplitRef.current.lines, {
          y: -80,
          opacity: 0,
          stagger: 0.04,
          duration: 0.5,
          ease: "power2.in",
        }, 0);
      }

      // Hide subcategories container
      tl.to(subMenuRef.current, {
        zIndex: 0,
        pointerEvents: "none",
        duration: 0.1,
      }, 0.4);

      // Hide back button
      tl.to(".back-button", {
        opacity: 0,
        zIndex: -10,
        pointerEvents: "none",
        duration: 0.3,
        ease: "power2.in",
      }, 0.2);

      // Show parents container
      if (parentsMenuRef.current) {
        tl.set(parentsMenuRef.current, {
          zIndex: 10,
          // opacity: 1,
          pointerEvents: "auto",
        }, 0.5);
      }
    }
    //changing parents opacity because we are hiding it
    if (phase === "PARENTS") {
      if (parentsMenuRef.current) {
        console.log("Setting parents visible in PARENTS phase");
        gsap.set(parentsMenuRef.current, {
          opacity: 1,
          pointerEvents: "auto",
          zIndex: 10,
        });
      }
    }
  }, [phase, setIsAnimating, setPhase]);

  // Parent entry animation after back (PARENTS phase after TO_PARENTS)
  useEffect(() => {
   if (
    phase === "PARENTS" &&
    parentsMenuRef.current &&
    showCategories
  ) {
      // Revert previous SplitText if exists
      if (parentsSplitRef.current) {
        parentsSplitRef.current.revert();
        parentsSplitRef.current = null;
      }

      // Wait one frame for layout
      requestAnimationFrame(() => {
        const parentItems = parentsMenuRef.current?.querySelectorAll(".individual-category");
        if (parentItems && parentItems.length > 0) {
          // Reset baseline transforms
          gsap.set(parentItems, { y: 0, opacity: 1 });

          parentsSplitRef.current = SplitText.create(parentItems, {
            type: "lines",
          });

          gsap.from(parentsSplitRef.current.lines, {
            opacity: 0,
            y: 100,
            stagger: 0.05,
            duration: 0.6,
            ease: "power2.out",
          });
        }
      });
    }
  }, [phase, categorySelected]);


  // Sync URL params with state on mount and when URL changes (handles direct navigation with params)
  useEffect(() => {
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");

  let targetPhase: CategoryPhase;

  if (!category) {
    targetPhase = "PARENTS";
    const tl = gsap.timeline();

    gsap.set('.back-button', {
      left : "25%"
    })

     tl.to('.card-filters-panel', {
          y: '100%',
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.25,
        }, 0);
    tl.to('.aside-filters', {
        opacity: 0,
        x: 50,
        zIndex: -10,
        pointerEvents: "none",
        duration: 0.4,
        ease: "power2.in",
      }, 0.1);

    tl.to("#close-svg-open", {
      strokeDashoffset: openSVGPathOffset,
      duration: 0.6,
      ease: "power2.in",
    }, 0);
    tl.to(".bolita-efecto-click", {
      opacity: 0,
      ease: "power2.in",
    }, 0);
    tl.to('.wrapper-dasharray', {
      x: '0rem',
      pointerEvents: 'none',
    }, 0.45)
    tl.to('.container-both-actions', {
       width: '4rem',
       x: '0rem',
       ease: "power2.out",
     }, 0.5);
     tl.to('.close-categories-button', {
       x: '0rem',
       ease: "power2.out",
     }, 0.55  );
  } else if (category && !subcategory) {
    targetPhase = "SUBCATEGORIES";
    const tl = gsap.timeline();

    gsap.set('.back-button', {
      left : "25%"
    })

    tl.to('.card-filters-panel', {
          y: '100%',
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.25,
        }, 0);
    tl.to('.aside-filters', {
        opacity: 0,
        x: 50,
        zIndex: -10,
        pointerEvents: "none",
        duration: 0.4,
        ease: "power2.in",
      }, 0);
    tl.to('.container-both-actions', {
        width: '10rem',
        x: '4rem',
        ease: "power2.out",
      }, 0);
      tl.to('.close-categories-button', {
        x: '-2rem',
        ease: "power2.out",
      }, 0);
      tl.to(".bolita-efecto-click", {
      opacity: 1,
      ease: "power2.in",
    }, 0.3);
    tl.to("#close-svg-open", {
      strokeDashoffset: 0,
      duration: 0.8,
      ease: "power2.out",
    }, 0.3);
    tl.to('.wrapper-dasharray', {
      x: '1.5rem',
      pointerEvents: 'auto',
    }, 0.3)
  } else {
    targetPhase = "ALL_FILTERS";
    const tl = gsap.timeline();

    gsap.set('.back-button', {
      left : "5%",
      zIndex: 70,
      opacity: 1,
      pointerEvents: "auto",
    })
    tl.to('.container-both-actions', {
        width: '10rem',
        x: '4rem',
        ease: "power2.out",
      }, 0);
      tl.to('.close-categories-button', {
        x: '-2rem',
        ease: "power2.out",
      }, 0);
       tl.to(".bolita-efecto-click", {
      opacity: 1,
      ease: "power2.in",
    }, 0.3);
    tl.to("#close-svg-open", {
      strokeDashoffset: 0,
      duration: 0.8,
      ease: "power2.out",
    }, 0.3);
    tl.to('.wrapper-dasharray', {
      x: '1.5rem',
      pointerEvents: 'auto',
    }, 0.4)
  }

  // No interferir con transiciones activas
  if (phase.startsWith("TO_")) return;

  if (phase !== targetPhase) {
    setPhase(targetPhase);
  }

}, [searchParams]);

useEffect(() => {
  const categorySlug = searchParams.get("category");

  if (!categorySlug || categories.length === 0) return;

  const matchedCategory = categories.find(
    (cat) => cat.slug === categorySlug
  );

  if (!matchedCategory) return;

  // Si ya está seleccionado, no hacer nada
  if (categorySelected?.slug === matchedCategory.slug) return;

  setCategorySelected(matchedCategory);

}, [searchParams, categories]);

  // Cleanup animations when panel closes
  useEffect(() => {
  if (!showCategories) {
    // 🔥 SOLO matar animaciones
    if (parentsSplitRef.current) {
      parentsSplitRef.current.revert();
      parentsSplitRef.current = null;
    }

    if (subSplitRef.current) {
      subSplitRef.current.revert();
      subSplitRef.current = null;
    }

    if (parentsMenuRef.current) {
      gsap.killTweensOf(parentsMenuRef.current);
    }

    if (subMenuRef.current) {
      gsap.killTweensOf(subMenuRef.current);
    }

    const aside = document.querySelector(".aside-filters");
    if (aside) {
      gsap.killTweensOf(aside);
    }
  }
}, [showCategories]);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", checkIsMobile);
    checkIsMobile(); 

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  // Adjust speedDrag based on device type
  useEffect(() => {
    if (isMobile) {
      setSpeedDrag(1.5);
    } else {
      setSpeedDrag(1.2);
    }
  }, [isMobile]);

  return (
   <>
   {/* boton para mostrar todas las categorias de nuevo */}
      <button
        onClick={handleBackClick}
        className="opacity-0 -z-10 back-button absolute left-1/5 -translate-x-1/2 top-1/2 -translate-y-1/2 cursor-pointer"
        style={{ pointerEvents: "none" }}
      >
        <BackButton className="w-10 rotate-180" />
      </button>

    <div className="card-infinite-scroll relative flex flex-col h-full items-center justify-center gap-12  px-4 lg:px-8 w-[95%] sm:w-6/12">
      
      <div className="relative w-full pt-20 h-dvh rounded-2xl ">
        <div className="flechitas-container absolute right-[10%] top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-2 z-10">
          {/* flechita arriba */}
          <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
            <path d="M1 9L11 1L21 9" stroke="black" />
          </svg>
          {/* flechita abajo */}
          <svg
            width="22"
            height="10"
            viewBox="0 0 22 10"
            fill="none"
            className="rotate-180"
          >
            <path d="M1 9L11 1L21 9" stroke="black" />
          </svg>
        </div>

        {/* Parents List - Always Mounted */}
        <ul
          ref={parentsMenuRef}
          className="parents-menu cursor-grab absolute top-0 left-0  w-full h-full select-none"
          style={{
            zIndex: 10,
            pointerEvents: "auto",
          }}
        >
          {categories.map((category, index) => (
            <li
              ref={(el) => {
                if (el) {
                  parentsItemsRef.current[index] = el;
                }
              }}
              key={category.id}
              className="absolute overflow-hidden h-36 w-full flex items-center justify-center"
            >
              <IndividualCategory
                category={category}
                onCategoryClick={handleParentClick}
                isDisabled={isAnimating}
              />
            </li>
          ))}
        </ul>

        {/* Subcategories List - Always Mounted */}
        <ul
          ref={subMenuRef}
          className="subcategories-menu cursor-grab absolute top-0 left-0  w-full h-full select-none"
          style={{
            zIndex: 0,
            pointerEvents: "none",
          }}
        >
          {subcategories.map((category, index) => (
            <li
              ref={(el) => {
                if (el) {
                  subItemsRef.current[index] = el;
                }
              }}
              key={category.id}
              className="absolute overflow-hidden h-36 w-full flex items-center justify-center"
            >
              <IndividualCategory
                category={category}
                onCategoryClick={handleSubcategoryClick}
                isDisabled={phase !== "SUBCATEGORIES"}
              />
            </li>
          ))}
        </ul>
      </div>
        <AsideCategoriesFilter categorySelected={categorySelected?.slug ?? null}/>
    </div>
   </>
  );
};
