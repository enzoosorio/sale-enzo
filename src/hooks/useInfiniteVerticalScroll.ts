import { useCallback, useLayoutEffect, useRef } from "react";
import gsap from "gsap";

interface InfiniteScrollOptions {
  menuRef: React.RefObject<HTMLUListElement | null>;
  itemsRef: React.RefObject<(HTMLLIElement | null)[]>;
  itemCount: number;
  isActive?: boolean;
  /** Fraction of the remaining distance covered per 60fps frame. */
  smoothing?: number;
  /** Change it when the rendered items are replaced (e.g. another category's subcategories). */
  resetKey?: string | null;
}

const DRAG_THRESHOLD = 8;
const REST_EPSILON = 0.5;
const FLING_MS = 180;

/**
 * Infinite vertical wheel/drag list.
 *
 * Items are positioned with one `quickSetter` each and the loop runs on the
 * GSAP ticker only while the list is moving, so an idle panel costs nothing.
 * When every item fits in the viewport the list is centered and static.
 */
export function useInfiniteVerticalScroll({
  menuRef,
  itemsRef,
  itemCount,
  isActive = true,
  smoothing = 0.1,
  resetKey = null,
}: InfiniteScrollOptions) {
  // Survives re-activation so a list keeps its position when the user comes back to it.
  // NaN until the first layout: the list then opens with its first item centered.
  const positionRef = useRef(Number.NaN);
  const lastResetKeyRef = useRef(resetKey);
  const nudgeRef = useRef<(direction: 1 | -1) => void>(() => {});

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu || !isActive || itemCount === 0) return;

    const items = itemsRef.current
      .slice(0, itemCount)
      .filter((item): item is HTMLLIElement => item !== null);
    if (items.length === 0) return;

    if (lastResetKeyRef.current !== resetKey) {
      lastResetKeyRef.current = resetKey;
      positionRef.current = Number.NaN;
    }

    const setY = items.map((item) => gsap.quickSetter(item, "y", "px") as (value: number) => void);
    const hidden: (boolean | null)[] = items.map(() => null);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let itemHeight = 0;
    let viewportHeight = 0;
    let totalHeight = 0;
    let isStatic = false;
    let wrap = (value: number) => value;

    let current = 0;
    let target = 0;
    let running = false;

    const measure = () => {
      itemHeight = items[0].offsetHeight || 144;
      viewportHeight = menu.clientHeight;
      totalHeight = itemHeight * items.length;
      isStatic = totalHeight <= viewportHeight;
      wrap = gsap.utils.wrap(-itemHeight * 0.5, totalHeight - itemHeight * 0.5);
    };

    const setHidden = (index: number, value: boolean) => {
      if (hidden[index] === value) return;
      hidden[index] = value;
      items[index].style.visibility = value ? "hidden" : "";
    };

    const render = () => {
      if (isStatic) {
        const offset = (viewportHeight - totalHeight) / 2;
        items.forEach((_, i) => {
          setY[i](offset + i * itemHeight);
          setHidden(i, false);
        });
        return;
      }

      items.forEach((_, i) => {
        const y = wrap(i * itemHeight + current);
        setY[i](y);
        setHidden(i, y < -itemHeight || y > viewportHeight + itemHeight);
      });
    };

    const tick = () => {
      const factor = reduceMotion
        ? 1
        : 1 - Math.pow(1 - smoothing, gsap.ticker.deltaRatio(60));
      current += (target - current) * factor;

      if (Math.abs(target - current) < REST_EPSILON) {
        current = target;
        stop();
      }

      positionRef.current = current;
      render();
    };

    const start = () => {
      if (running || isStatic) return;
      running = true;
      gsap.ticker.add(tick);
    };

    function stop() {
      if (!running) return;
      running = false;
      gsap.ticker.remove(tick);
    }

    const moveBy = (delta: number) => {
      if (isStatic) return;
      target += delta;
      start();
    };

    nudgeRef.current = (direction) => moveBy(-direction * itemHeight);

    // Wheel
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewportHeight : 1;
      moveBy(-e.deltaY * unit);
    };

    // Drag (mouse, pen and touch through Pointer Events)
    let pointerId: number | null = null;
    let startY = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocity = 0;
    let dragging = false;
    let suppressClick = false;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointerId = e.pointerId;
      startY = lastY = e.clientY;
      lastTime = e.timeStamp;
      velocity = 0;
      dragging = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;

      if (!dragging) {
        if (Math.abs(e.clientY - startY) < DRAG_THRESHOLD) return;
        dragging = true;
        menu.setPointerCapture(e.pointerId);
        menu.classList.add("is-dragging");
      }

      const speed = e.pointerType === "touch" ? 1.5 : 1.2;
      const delta = (e.clientY - lastY) * speed;
      const elapsed = Math.max(1, e.timeStamp - lastTime);
      velocity = velocity * 0.6 + (delta / elapsed) * 0.4;
      lastY = e.clientY;
      lastTime = e.timeStamp;
      moveBy(delta);
    };

    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      if (!dragging) return;

      dragging = false;
      suppressClick = true;
      menu.classList.remove("is-dragging");
      if (menu.hasPointerCapture(e.pointerId)) menu.releasePointerCapture(e.pointerId);
      moveBy(velocity * FLING_MS);
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    // Keyboard: arrows move one item; focusing an item brings it to the center.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeRef.current(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeRef.current(-1);
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      if (isStatic) return;
      const index = items.findIndex((item) => item.contains(e.target as Node));
      if (index === -1) return;
      let desired = viewportHeight / 2 - itemHeight / 2 - index * itemHeight;
      desired += Math.round((target - desired) / totalHeight) * totalHeight;
      target = desired;
      start();
    };

    const resizeObserver = new ResizeObserver(() => {
      measure();
      render();
    });

    measure();
    if (Number.isNaN(positionRef.current)) {
      positionRef.current = viewportHeight / 2 - itemHeight / 2;
    }
    current = target = positionRef.current;
    render();
    resizeObserver.observe(menu);

    menu.addEventListener("wheel", onWheel, { passive: false });
    menu.addEventListener("pointerdown", onPointerDown);
    menu.addEventListener("pointermove", onPointerMove);
    menu.addEventListener("pointerup", onPointerEnd);
    menu.addEventListener("pointercancel", onPointerEnd);
    menu.addEventListener("click", onClickCapture, true);
    menu.addEventListener("keydown", onKeyDown);
    menu.addEventListener("focusin", onFocusIn);

    return () => {
      stop();
      resizeObserver.disconnect();
      menu.classList.remove("is-dragging");
      menu.removeEventListener("wheel", onWheel);
      menu.removeEventListener("pointerdown", onPointerDown);
      menu.removeEventListener("pointermove", onPointerMove);
      menu.removeEventListener("pointerup", onPointerEnd);
      menu.removeEventListener("pointercancel", onPointerEnd);
      menu.removeEventListener("click", onClickCapture, true);
      menu.removeEventListener("keydown", onKeyDown);
      menu.removeEventListener("focusin", onFocusIn);
      nudgeRef.current = () => {};
    };
  }, [menuRef, itemsRef, itemCount, isActive, smoothing, resetKey]);

  /** Move the list one item up (-1) or down (1). */
  const nudge = useCallback((direction: 1 | -1) => nudgeRef.current(direction), []);

  return { nudge };
}
