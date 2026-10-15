import { useCallback, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

interface InfiniteScrollOptions {
  menuRef: React.RefObject<HTMLUListElement | null>;
  itemsRef: React.RefObject<(HTMLLIElement | null)[]>;
  itemCount: number;
  isActive?: boolean;
  /**
   * `true`: infinite wheel/drag loop when the items overflow the viewport.
   * `false`: plain centered stack; overflow falls back to native scrolling.
   */
  loop?: boolean;
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
 * When every item fits in the viewport (or `loop` is off) the list is static
 * and ignores wheel/drag, which `isStatic` exposes so the UI can drop its
 * drag affordances.
 */
export function useInfiniteVerticalScroll({
  menuRef,
  itemsRef,
  itemCount,
  isActive = true,
  loop = true,
  smoothing = 0.1,
  resetKey = null,
}: InfiniteScrollOptions) {
  // Survives re-activation so a list keeps its position when the user comes back to it.
  // NaN until the first layout: the list then opens with its first item centered.
  const positionRef = useRef(Number.NaN);
  const lastResetKeyRef = useRef(resetKey);
  const nudgeRef = useRef<(direction: 1 | -1) => void>(() => {});
  const [isStatic, setIsStatic] = useState(true);

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
    let fits = true;
    let staticList = true;
    let wrap = (value: number) => value;

    let current = 0;
    let target = 0;
    let running = false;

    // Returns false while the menu has no layout yet (e.g. first frame of the panel).
    const measure = () => {
      const height = menu.clientHeight;
      if (height === 0) return false;
      itemHeight = items[0].offsetHeight || 144;
      viewportHeight = height;
      totalHeight = itemHeight * items.length;
      fits = totalHeight <= viewportHeight;
      staticList = !loop || fits;
      wrap = gsap.utils.wrap(-itemHeight * 0.5, totalHeight - itemHeight * 0.5);
      menu.classList.toggle("is-static", staticList);
      // A list that fits has nothing to fade under the edges; the mask would only dim its ends.
      menu.classList.toggle("is-fit", fits);
      // Non-looping lists that overflow scroll natively (transforms count as scrollable overflow).
      menu.style.overflowY = !loop && !fits ? "auto" : "";
      setIsStatic(staticList);
      if (staticList) stop();
      return true;
    };

    const setHidden = (index: number, value: boolean) => {
      if (hidden[index] === value) return;
      hidden[index] = value;
      items[index].style.visibility = value ? "hidden" : "";
    };

    const render = () => {
      if (viewportHeight === 0) return;
      if (staticList) {
        const offset = Math.max(0, (viewportHeight - totalHeight) / 2);
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
      if (running || staticList) return;
      running = true;
      gsap.ticker.add(tick);
    };

    function stop() {
      if (!running) return;
      running = false;
      gsap.ticker.remove(tick);
    }

    // Rest positions keep one title exactly centered, never half cut by the edges.
    const snapTarget = (value: number) => {
      const center = viewportHeight / 2 - itemHeight / 2;
      return center + Math.round((value - center) / itemHeight) * itemHeight;
    };

    const moveBy = (delta: number, snap = false) => {
      if (staticList) return;
      target += delta;
      if (snap) target = snapTarget(target);
      start();
    };

    nudgeRef.current = (direction) => moveBy(-direction * itemHeight, true);

    // Wheel: accumulate freely, snap once the wheel goes quiet.
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      if (staticList) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewportHeight : 1;
      moveBy(-e.deltaY * unit);
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => moveBy(0, true), 140);
    };

    // Drag (mouse, pen and touch through Pointer Events)
    let pointerId: number | null = null;
    let startY = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocity = 0;
    let dragging = false;
    let suppressClick = false;
    let suppressTimer: ReturnType<typeof setTimeout> | undefined;

    const endDrag = () => {
      if (pointerId !== null && menu.hasPointerCapture(pointerId)) {
        menu.releasePointerCapture(pointerId);
      }
      pointerId = null;
      dragging = false;
      menu.classList.remove("is-dragging");
    };

    const onPointerDown = (e: PointerEvent) => {
      suppressClick = false;
      if (staticList || e.button !== 0) return;
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
      const wasDragging = dragging;
      endDrag();
      if (!wasDragging) return;

      // Only the click synthesized by this very release is swallowed; if the
      // release happened off a button no click comes and the flag must not linger.
      suppressClick = true;
      clearTimeout(suppressTimer);
      suppressTimer = setTimeout(() => {
        suppressClick = false;
      }, 0);
      moveBy(velocity * FLING_MS, true);
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    // Keyboard: arrows move one item; keyboard focus brings the item to the center.
    const onKeyDown = (e: KeyboardEvent) => {
      if (staticList) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeRef.current(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeRef.current(-1);
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      if (staticList || pointerId !== null) return;
      const element = e.target as HTMLElement;
      // Pointer focus (click / drag start) must not move the list under the finger.
      if (!element.matches?.(":focus-visible")) return;
      const index = items.findIndex((item) => item.contains(element));
      if (index === -1) return;
      let desired = viewportHeight / 2 - itemHeight / 2 - index * itemHeight;
      desired += Math.round((target - desired) / totalHeight) * totalHeight;
      target = desired;
      start();
    };

    const initPosition = () => {
      if (Number.isNaN(positionRef.current)) {
        positionRef.current = snapTarget(0);
      }
      current = target = positionRef.current;
    };

    let initialized = measure();
    if (initialized) initPosition();
    render();

    const resizeObserver = new ResizeObserver(() => {
      if (!measure()) return;
      if (!initialized) {
        initialized = true;
        initPosition();
      }
      render();
    });
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
      endDrag();
      clearTimeout(wheelTimer);
      clearTimeout(suppressTimer);
      // Resume exactly where the list was heading, already snapped.
      if (initialized && !staticList) positionRef.current = snapTarget(target);
      resizeObserver.disconnect();
      menu.style.overflowY = "";
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
  }, [menuRef, itemsRef, itemCount, isActive, loop, smoothing, resetKey]);

  /** Move the list one item up (-1) or down (1). */
  const nudge = useCallback((direction: 1 | -1) => nudgeRef.current(direction), []);

  return { nudge, isStatic };
}
