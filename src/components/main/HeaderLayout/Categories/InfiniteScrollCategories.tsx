import gsap from "gsap";
import React, { useEffect, useRef, useState } from "react";
import { categories } from "@/lib/categories";
import { Categories } from "@/types/categories";
import { IndividualCategory } from "./IndividualCategory";
import { BackButton } from "@/components/reusable/svgs/BackButton";
import { AsideCategoriesFilter } from "./AsideCategories/Filters/AsideProduct&Filters";

interface InfiniteScrollCategoriesProps {
  isAnimating: boolean;
  setIsAnimating: React.Dispatch<React.SetStateAction<boolean>>;
}

export const InfiniteScrollCategories = ({ isAnimating, setIsAnimating }: InfiniteScrollCategoriesProps) => {
  const menuRef = useRef<HTMLUListElement>(null);
  const itemsRef = useRef<(HTMLLIElement | null)[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [speedDrag, setSpeedDrag] = useState(1.2);
  const [categorySelected, setCategorySelected] = useState<Categories | null>(null);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", checkIsMobile);
    checkIsMobile(); // Check on mount

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  // Adjust speedDrag based on device type
  useEffect(() => {
    if (isMobile) {
      setSpeedDrag(1.5); // Increase drag sensitivity for mobile
    } else {
      setSpeedDrag(1.2); // Default drag sensitivity for desktop
    }
  }, [isMobile]);

  // animacion loop infinito
  useEffect(() => {
    // Inicializar el array de refs con la longitud correcta
    itemsRef.current = itemsRef.current.slice(0, categories.length);

    const menu = menuRef.current;
    if (!menu) return;
    const items = itemsRef.current;

    // Wait for all refs to be populated
    const validItems = items.filter(
      (item) => item !== null && item !== undefined
    );
    if (validItems.length === 0 || validItems.length !== categories.length) {
      // Retry after a short delay to allow refs to populate
      const timeoutId = setTimeout(() => {
        // Force re-run
      }, 10);
      return () => clearTimeout(timeoutId);
    }

    const containerHeight = window.innerHeight; // 200px del contenedor
    let itemHeight = 140; // Altura fija para cada elemento (ajustar según necesites)
    let totalMenuHeight = itemHeight * validItems.length;

    // inicializamos variables de scroll en Y pues nuestro scroll infinito es vertical
    let currentScrollPosition = 0;
    let smoothScrollY = 0;
    let animationId: number;

    const lerp = (start: number, end: number, factor: number) => {
      return start * (1 - factor) + end * factor;
    };

    const adjustMenuItemsPos = (scroll: number) => {
      const currentValidItems = items.filter(
        (item) => item !== null && item !== undefined
      );
      if (currentValidItems.length > 0) {
        gsap.set(currentValidItems, {
          y: (i) => {
            const baseY = i * itemHeight + scroll;
            // Improved wrap around logic for seamless infinite scroll
            const wrappedY = gsap.utils.wrap(
              -itemHeight * 0.5, // Start a bit earlier
              totalMenuHeight - itemHeight * 0.5, // End a bit later
              baseY
            );
            return wrappedY;
          },
          opacity: (i) => {
            // Calculate opacity based on position in viewport
            const baseY = i * itemHeight + scroll;
            const wrappedY = gsap.utils.wrap(
              -itemHeight * 0.5,
              totalMenuHeight - itemHeight * 0.5,
              baseY
            );

            // Show elements only when they're within the visible area with smoother transitions
            const isVisible =
              wrappedY >= -itemHeight &&
              wrappedY <= containerHeight + itemHeight;
            return isVisible ? 1 : 0;
          },
        });
      }
    };
    adjustMenuItemsPos(0);

    const onWheelScroll = (e: WheelEvent) => {
      e.preventDefault(); // Prevent default scroll behavior
      e.stopPropagation(); // Stop event bubbling to parent elements
      e.stopImmediatePropagation(); // Stop all further event propagation
      currentScrollPosition += -e.deltaY;
    };

    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let hasMoved = false;
    let dragThreshold = 5; // Minimum pixels to move before considering it a drag

    const onDragStart = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      hasMoved = false;
      if (e instanceof TouchEvent) {
        startY = -e.touches[0].clientY;
        // Don't prevent default on touchstart to allow clicks
      } else {
        e.preventDefault(); // Prevent text selection and default behavior for mouse
        startY = -e.clientY;
        menu.classList.add("is-dragging");
        document.body.style.userSelect = "none";
        menu.style.cursor = "grabbing";
      }
    };

    const onDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      if (e instanceof TouchEvent) {
        currentY = -e.touches[0].clientY;
      } else {
        currentY = -e.clientY;
      }

      // Check if we've moved enough to consider this a drag
      const deltaY = Math.abs(currentY - startY);
      if (deltaY > dragThreshold) {
        hasMoved = true;
        e.preventDefault(); // Prevent default behavior
        e.stopPropagation(); // Stop event bubbling to prevent page scroll

        if (e instanceof TouchEvent) {
          menu.classList.add("is-dragging");
          document.body.style.userSelect = "none";
        }
      }

      // Only apply scroll if we've confirmed it's a drag movement
      if (hasMoved) {
        // Calculate the delta (difference) and apply speed multiplier to it
        const delta = (currentY - startY) * speedDrag;
        startY = currentY; // Update startY to current position for next calculation
        currentScrollPosition += -delta; // Apply the modified delta
      }
    };

    const onDragEnd = () => {
      isDragging = false;
      hasMoved = false;
      menu.classList.remove("is-dragging");
      // Restore text selection and cursor
      document.body.style.userSelect = "";
      menu.style.cursor = "grab";
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      smoothScrollY = lerp(smoothScrollY, currentScrollPosition, 0.1);

      adjustMenuItemsPos(smoothScrollY);

      // Optional: Add skew effect based on scroll speed if needed
      const scrollSpeed = smoothScrollY - currentScrollPosition;
      const currentValidItems = items.filter(
        (item) => item !== null && item !== undefined
      );
      if (currentValidItems.length > 0) {
        gsap.to(currentValidItems, {
          duration: 0.6,
          skewY: -scrollSpeed * 0.02,
          ease: "power3.out",
        });
      }
    };

    menu.addEventListener("wheel", onWheelScroll, { passive: false });
    menu.addEventListener("mousedown", onDragStart, { passive: false });
    menu.addEventListener("touchstart", onDragStart, { passive: false });

    // Use menu for touchmove instead of window to better control propagation
    menu.addEventListener(
      "touchmove",
      (e: TouchEvent) => {
        if (isDragging) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          onDragMove(e);
        }
      },
      { passive: false }
    );

    window.addEventListener("mousemove", onDragMove, { passive: false });
    window.addEventListener("mouseup", onDragEnd);
    window.addEventListener("touchend", onDragEnd);

    // Start the animation loop
    animate();

    // Cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      menu.removeEventListener("wheel", onWheelScroll);
      menu.removeEventListener("mousedown", onDragStart);
      menu.removeEventListener("touchstart", onDragStart);
      menu.removeEventListener("touchmove", onDragMove);
      window.removeEventListener("mousemove", onDragMove);
      window.removeEventListener("mouseup", onDragEnd);
      window.removeEventListener("touchend", onDragEnd);
    };
  }, [categories.length]);


  
  return (
   <>
   {/* boton para mostrar todas las categorias de nuevo */}
      <button
        onClick={() => {
          setIsAnimating(false);
        }}
        className="opacity-0 -z-10 back-button absolute left-10 top-1/2 -translate-y-1/2  cursor-pointer "
      >
        <BackButton className="w-10 rotate-180" />
      </button>

    <div className="card-infinite-scroll  flex flex-col h-full items-center justify-center gap-12  px-4 lg:px-8 w-[95%] sm:w-6/12">
      
      <div className="relative w-full pt-14 h-dvh rounded-2xl py-4 ">
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
        <ul
          ref={menuRef}
          className="infinite-menu-items cursor-grab relative w-full h-full select-none"
        >
          {categories.map((category, index) => (
            <li
              ref={(el) => {
                if (el) {
                  itemsRef.current[index] = el;
                }
              }}
              key={index}
              className="absolute overflow-hidden w-full flex items-center justify-center"
            >
              <IndividualCategory
                category={category}
                menuRef={menuRef}
                isAnimating={isAnimating}
                setIsAnimating={setIsAnimating}
                categorySelected={categorySelected}
                setCategorySelected={setCategorySelected}
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
