    import { useEffect } from "react";
    import gsap from "gsap";

    interface InfiniteScrollOptions {
    menuRef: React.RefObject<HTMLUListElement | null>;
    itemsRef: React.RefObject<(HTMLLIElement | null)[]>;
    itemCount: number;
    speedDrag: number;
    isActive?: boolean; // Control whether this scroll system is active
    }

    /**
     * Custom hook for infinite vertical scroll with drag and wheel support
     * Handles positioning, wrapping, and smooth animations for menu items
     */
    export function useInfiniteVerticalScroll({
    menuRef,
    itemsRef,
    itemCount,
    speedDrag,
    isActive = true,
    }: InfiniteScrollOptions) {
    useEffect(() => {
        if (!menuRef.current || itemCount === 0 || !isActive) return;

        const menu = menuRef.current;
        const items = itemsRef.current.filter((item): item is HTMLLIElement => item !== null);
        let waitFrameId: number | null = null;

        let animationId: number | null = null;
        let isInitialized = false;
        
    // Recursive wait loop until layout is stable
    const waitForLayout = () => {
      const menuRect = menu.getBoundingClientRect();
      const menuHeight = menu.offsetHeight;
      const firstItemHeight = items[0]?.offsetHeight || 0;

      // Check all conditions for stable layout
      const isLayoutReady = 
        menuHeight > 0 && 
        menuRect.width > 0 && 
        items.length === itemCount && 
        firstItemHeight > 0;

      if (!isLayoutReady) {
        console.log('[useInfiniteVerticalScroll] Waiting for layout...', {
          menuHeight,
          menuWidth: menuRect.width,
          itemsLength: items.length,
          expectedCount: itemCount,
          firstItemHeight,
        });
        waitFrameId = requestAnimationFrame(waitForLayout);
        return;
      }

      // Layout is stable, proceed with initialization
      console.log('[useInfiniteVerticalScroll] Layout ready, initializing...', {
        menuHeight,
        itemHeight: firstItemHeight,
        itemCount: items.length,
      });
      
      initializeScroll();
    };

    if (items.length === 0 || items.length !== itemCount) {
        waitFrameId = requestAnimationFrame(waitForLayout);
        return;
        }

    const initializeScroll = () => {
      // Force layout calculation
      items.forEach(item => item.getBoundingClientRect());

      // Dynamically measure item height from first item
      const itemHeight = items[0]?.offsetHeight || 140;
      
      // Use menu height instead of window height
      const containerHeight = menu.offsetHeight;
      const totalMenuHeight = itemHeight * items.length;

      console.log('[useInfiniteVerticalScroll] Initialized with:', {
        itemHeight,
        containerHeight,
        totalMenuHeight,
        itemCount: items.length,
      });

      // Reset baseline positions before wrapping
      gsap.set(items, { y: 0 });

      let currentScrollPosition = 0;
      let smoothScrollY = 0;

      const lerp = (start: number, end: number, factor: number) => {
        return start * (1 - factor) + end * factor;
      };

      const adjustMenuItemsPos = (scroll: number) => {
        gsap.set(items, {
          y: (i) => {
            const baseY = i * itemHeight + scroll;
            const wrappedY = gsap.utils.wrap(
              -itemHeight * 0.5,
              totalMenuHeight - itemHeight * 0.5,
              baseY
            );
            return wrappedY;
          },
          opacity: (i) => {
            const baseY = i * itemHeight + scroll;
            const wrappedY = gsap.utils.wrap(
              -itemHeight * 0.5,
              totalMenuHeight - itemHeight * 0.5,
              baseY
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
        console.log('wheelin')
      };

      let startY = 0;
      let currentY = 0;
      let isDragging = false;
      let hasMoved = false;
      // Drag threshold in pixels to prevent accidental drags from minor movements
      const dragThreshold = 50;

      const onDragStart = (e: MouseEvent | TouchEvent) => {
         console.log('[DRAG] mousedown fired', { menuId: menu.id });
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
        console.log('[DRAG] mousemove fired', { isDragging, hasMoved });
        console.log('dragging');
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

      // Attach event listeners only when active
      menu.addEventListener("wheel", onWheelScroll, { passive: false });
      menu.addEventListener("mousedown", onDragStart, { passive: false });
      menu.addEventListener("touchstart", onDragStart, { passive: false });

      menu.addEventListener(
        "touchmove",
        (e: TouchEvent) => {
          if (isDragging) {
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

      // Start animation loop
      animate();
      isInitialized = true;

      // Store cleanup functions
      (menu as any)._infiniteScrollCleanup = () => {
        if (animationId !== null) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
        menu.removeEventListener("wheel", onWheelScroll);
        menu.removeEventListener("mousedown", onDragStart);
        menu.removeEventListener("touchstart", onDragStart);
        menu.removeEventListener("touchmove", onDragMove);
        window.removeEventListener("mousemove", onDragMove);
        window.removeEventListener("mouseup", onDragEnd);
        window.removeEventListener("touchend", onDragEnd);
      };
    };

    // Start recursive wait for stable layout
    waitForLayout();

    return () => {
      // Cancel wait frame if initialization not started
      if (waitFrameId !== null) {
        cancelAnimationFrame(waitFrameId);
        waitFrameId = null;
      }
      
      // Run stored cleanup
      if ((menu as any)._infiniteScrollCleanup) {
        (menu as any)._infiniteScrollCleanup();
        delete (menu as any)._infiniteScrollCleanup;
      }
      
      // Final cleanup of animation frame
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    };
  }, [menuRef, itemsRef, itemCount, speedDrag, isActive]);
}
