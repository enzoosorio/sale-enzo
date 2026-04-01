import { useEffect } from "react";
import gsap from "gsap";

interface InfiniteScrollOptions {
  menuRef: React.RefObject<HTMLUListElement | null>;
  itemsRef: React.RefObject<(HTMLLIElement | null)[]>;
  itemCount: number;
  speedDrag: number;
  isActive?: boolean;
  showCategories?: boolean;
}

export function useInfiniteVerticalScroll({
  menuRef,
  itemsRef,
  itemCount,
  speedDrag,
  isActive = true,
  showCategories,
}: InfiniteScrollOptions) {
  useEffect(() => {
    if (!menuRef.current || itemCount === 0 || !isActive) return;

    const menu = menuRef.current;

    let waitFrameId: number | null = null;
    let animationId: number | null = null;

    let currentScrollPosition = 0;
    let smoothScrollY = 0;

    const lerp = (start: number, end: number, factor: number) => {
      return start * (1 - factor) + end * factor;
    };

    const initializeScroll = () => {
      const items = itemsRef.current.filter(
        (item): item is HTMLLIElement => item !== null,
      );

      if (items.length === 0) return;

      items.forEach((item) => item.getBoundingClientRect());

      const itemHeight = items[0]?.offsetHeight || 140;
      const containerHeight = menu.offsetHeight;
      const totalMenuHeight = itemHeight * items.length;

      console.log("[InfiniteScroll] INIT", {
        itemHeight,
        containerHeight,
        totalMenuHeight,
      });

      gsap.set(items, { y: 0 });

      const adjustMenuItemsPos = (scroll: number) => {
        gsap.set(items, {
          y: (i) => {
            const baseY = i * itemHeight + scroll;

            const wrappedY = gsap.utils.wrap(
              -itemHeight * 0.5,
              totalMenuHeight - itemHeight * 0.5,
              baseY,
            );

            return wrappedY;
          },

          opacity: (i) => {
            const baseY = i * itemHeight + scroll;

            const wrappedY = gsap.utils.wrap(
              -itemHeight * 0.5,
              totalMenuHeight - itemHeight * 0.5,
              baseY,
            );

            const isVisible =
              wrappedY >= -itemHeight &&
              wrappedY <= containerHeight + itemHeight;

            return isVisible ? 1 : 0;
          },
        });
      };

      adjustMenuItemsPos(0);

      const onWheelScroll = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        currentScrollPosition += -e.deltaY;
      };

      let startY = 0;
      let currentY = 0;
      let isDragging = false;
      let hasMoved = false;

      const dragThreshold = 50;

      const onDragStart = (e: MouseEvent | TouchEvent) => {
        isDragging = true;
        hasMoved = false;

        if (e instanceof TouchEvent) {
          startY = -e.touches[0].clientY;
        } else {
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

        const deltaY = Math.abs(currentY - startY);

        if (deltaY > dragThreshold) {
          hasMoved = true;

          e.preventDefault();
          e.stopPropagation();

          if (e instanceof TouchEvent) {
            menu.classList.add("is-dragging");
            document.body.style.userSelect = "none";
          }
        }

        if (hasMoved) {
          const delta = (currentY - startY) * speedDrag;
          startY = currentY;

          currentScrollPosition += -delta;
        }
      };

      const onDragEnd = () => {
        isDragging = false;
        hasMoved = false;

        menu.classList.remove("is-dragging");
        document.body.style.userSelect = "";
        menu.style.cursor = "grab";
      };

      const animate = () => {
        animationId = requestAnimationFrame(animate);

        smoothScrollY = lerp(smoothScrollY, currentScrollPosition, 0.1);

        adjustMenuItemsPos(smoothScrollY);

        const scrollSpeed = smoothScrollY - currentScrollPosition;

        gsap.to(items, {
          duration: 0.6,
          skewY: -scrollSpeed * 0.02,
          ease: "power3.out",
        });
      };

      menu.addEventListener("wheel", onWheelScroll);
      menu.addEventListener("mousedown", onDragStart);
      menu.addEventListener("touchstart", onDragStart);

      menu.addEventListener("touchmove", (e: TouchEvent) => {
        if (isDragging) {
          e.stopPropagation();
          e.stopImmediatePropagation();
          onDragMove(e);
        }
      });

      window.addEventListener("mousemove", onDragMove);
      window.addEventListener("mouseup", onDragEnd);
      window.addEventListener("touchend", onDragEnd);

      animate();

      (menu as any)._infiniteScrollCleanup = () => {
        if (animationId !== null) cancelAnimationFrame(animationId);

        menu.removeEventListener("wheel", onWheelScroll);
        menu.removeEventListener("mousedown", onDragStart);
        menu.removeEventListener("touchstart", onDragStart);
        window.removeEventListener("mousemove", onDragMove);
        window.removeEventListener("mouseup", onDragEnd);
        window.removeEventListener("touchend", onDragEnd);
      };
    };

    const waitForLayout = () => {
      const items = itemsRef.current.filter(
        (item): item is HTMLLIElement => item !== null,
      );

      const menuRect = menu.getBoundingClientRect();
      const menuHeight = menu.offsetHeight;
      const firstItemHeight = items[0]?.offsetHeight || 0;

      const isLayoutReady =
        menuHeight > 0 &&
        menuRect.width > 0 &&
        items.length === itemCount &&
        firstItemHeight > 0;

      if (!isLayoutReady) {
        waitFrameId = requestAnimationFrame(waitForLayout);
        return;
      }

      initializeScroll();
    };

    /*
      🔥 SOLUCIÓN CLAVE
      Cuando el panel se abre, esperamos 2 frames para que
      GSAP termine el layout y luego recalculamos todo
    */

    if (showCategories) {
    waitFrameId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        waitForLayout();
      });
    });
  }

    return () => {
      if (waitFrameId !== null) cancelAnimationFrame(waitFrameId);

      if ((menu as any)._infiniteScrollCleanup) {
        (menu as any)._infiniteScrollCleanup();
        delete (menu as any)._infiniteScrollCleanup;
      }

      if (animationId !== null) cancelAnimationFrame(animationId);
    };
  }, [menuRef, itemsRef, itemCount, speedDrag, isActive, showCategories]);
}