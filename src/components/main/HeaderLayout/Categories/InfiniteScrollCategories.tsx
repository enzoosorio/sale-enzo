import gsap from "gsap";
import React, { useEffect, useMemo, useRef, useState, useCallback} from "react";
import { SplitText } from "gsap/all";
import { Categories } from "@/types/products/old_category/categories";
import { IndividualCategory } from "./IndividualCategory";
import { BackButton } from "@/components/reusable/svgs/BackButton";
import { AsideCategoriesFilter } from "./AsideCategories/Filters/AsideProduct&Filters";
import { useCategoriesStore } from "@/store/categorySection";
import { ProductCategory } from "@/schema/categorySchema";
import { getSubcategoriesByParentId } from "@/utils/filters";
import { useInfiniteVerticalScroll } from "@/hooks/useInfiniteVerticalScroll";
import { CategoryPhase } from "./Categories";


interface InfiniteScrollCategoriesProps {
  isAnimating: boolean;
  setIsAnimating: React.Dispatch<React.SetStateAction<boolean>>;
  showCategories?: boolean;
  phase: CategoryPhase;
  setPhase: React.Dispatch<React.SetStateAction<CategoryPhase>>;
}

export const InfiniteScrollCategories = ({ isAnimating, setIsAnimating, showCategories, phase, setPhase }: InfiniteScrollCategoriesProps) => {
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
  const [subcategorySelected, setSubcategorySelected] = useState<Categories | null>(null);
  const { parentCategories } = useCategoriesStore();

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

useEffect(() => {
  subItemsRef.current = [];
}, [subcategories]);


  // Handle parent category click
  const handleParentClick = useCallback((category: Categories) => {
    if (phase !== "PARENTS") return;
    setPhase("TO_SUB");
    setIsAnimating(true);
    setCategorySelected(category);
  }, [phase, setIsAnimating]);

  // Fetch subcategories when transitioning to subcategories
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (categorySelected && phase === "TO_SUB") {
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

  // Parent exit animation (TO_SUB phase)
  useEffect(() => {
    if (phase === "TO_SUB" && subcategories.length > 0 && parentsMenuRef.current) {
      // Revert previous SplitText if exists
      if (parentsSplitRef.current) {
        parentsSplitRef.current.revert();
        parentsSplitRef.current = null;
      }

      const tl = gsap.timeline({
        onComplete: () => {
          setPhase("SUBCATEGORIES");
        },
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
  }, [phase, subcategories]);

  // Subcategory entry animation (SUBCATEGORIES phase)
  useEffect(() => {
    if (phase === "SUBCATEGORIES" && subcategories.length > 0 && subMenuRef.current && parentsMenuRef.current) {
      // Force layout calculation
      subMenuRef.current.getBoundingClientRect();
      subItemsRef.current.forEach(item => item?.getBoundingClientRect());

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

  // Handle back button click
  const handleBackClick = useCallback(() => {
    if (phase !== "SUBCATEGORIES") return;
    setPhase("TO_PARENTS");
  }, [phase]);

  // Subcategory exit animation (TO_PARENTS phase)
  useEffect(() => {
    if (phase === "TO_PARENTS" && subMenuRef.current) {
      // Revert previous SplitText if exists
      if (subSplitRef.current) {
        subSplitRef.current.revert();
        subSplitRef.current = null;
      }

      const tl = gsap.timeline({
        onComplete: () => {
          setSubcategories([]);
          setCategorySelected(null);
          setSubcategorySelected(null);
          setPhase("PARENTS");
          setIsAnimating(false);
        },
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
          pointerEvents: "auto",
        }, 0.5);
      }
    }
  }, [phase, setIsAnimating]);

  // Parent entry animation after back (PARENTS phase after TO_PARENTS)
  useEffect(() => {
    if (phase === "PARENTS" && parentsMenuRef.current && !categorySelected) {
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

  // Reset state when panel closes
  useEffect(() => {
    if (showCategories === false && (phase !== "PARENTS" || categorySelected)) {
      // Revert all SplitText instances first
      if (parentsSplitRef.current) {
        parentsSplitRef.current.revert();
        parentsSplitRef.current = null;
      }
      if (subSplitRef.current) {
        subSplitRef.current.revert();
        subSplitRef.current = null;
      }
      
      // Kill all ongoing animations specifically on subcategories
      if (subMenuRef.current) {
        gsap.killTweensOf(subMenuRef.current);
        const subChildren = subMenuRef.current.querySelectorAll("li, .individual-category, p");
        gsap.killTweensOf(subChildren);
      }
      
      // Reset state
      setPhase("PARENTS");
      setCategorySelected(null);
      setSubcategories([]);
      setSubcategorySelected(null);
      setIsAnimating(false);
      
      // Clear all transforms after state reset
      requestAnimationFrame(() => {
        if (parentsMenuRef.current) {
          gsap.set(parentsMenuRef.current, {
            clearProps: "all",
            zIndex: 10,
            pointerEvents: "auto",
          });
        }
        
        if (subMenuRef.current) {
          // First clear ALL transforms from container
          gsap.set(subMenuRef.current, {
            clearProps: "all",
          });
          
          // Clear transforms from all li elements
          const subLiElements = subMenuRef.current.querySelectorAll("li");
          if (subLiElements.length > 0) {
            gsap.set(subLiElements, {
              clearProps: "all",
            });
          }
          
          // Clear transforms from all .individual-category and nested p elements
          const subTextElements = subMenuRef.current.querySelectorAll(".individual-category, .individual-category p, .individual-category div");
          if (subTextElements.length > 0) {
            gsap.set(subTextElements, {
              clearProps: "all",
            });
          }
          
          // Now set the required display properties
          gsap.set(subMenuRef.current, {
            zIndex: 0,
            pointerEvents: "none",
          });
        }
        
        gsap.set(".back-button", {
          clearProps: "all",
          opacity: 0,
          zIndex: -10,
          pointerEvents: "none",
        });
      });
    }
  }, [showCategories, phase, categorySelected, setIsAnimating]);

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

    <div className="card-infinite-scroll  flex flex-col h-full items-center justify-center gap-12  px-4 lg:px-8 w-[95%] sm:w-6/12">
      
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
              className="absolute overflow-hidden h-36  w-full flex items-center justify-center"
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
          className="subcategories-menu cursor-grab absolute top-0 left-0 overflow-hidden w-full h-full select-none"
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
              className="absolute overflow-hidden h-36  w-full flex items-center justify-center"
            >
              <IndividualCategory
                category={category}
                onCategoryClick={(cat) => {
                  if (!isAnimating) {
                    setSubcategorySelected(cat);
                  }
                }}
                isDisabled={isAnimating}
              />
            </li>
          ))}
        </ul>

        <AsideCategoriesFilter categorySelected={categorySelected?.name || null} />
      </div>
    </div>
   </>
  );
};