// hooks/useSplitText.ts
import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/all";

gsap.registerPlugin(SplitText);

export function useSplitText(
  containerRef: React.RefObject<HTMLElement> | React.RefObject<HTMLUListElement | null>,
  selector: string,
  options?: { type?: string; linesClass?: string }
) {
  const splitRef = useRef<SplitText | null>(null);

  const cleanup = useCallback(() => {
    if (splitRef.current) {
      splitRef.current.revert();
      splitRef.current = null;
    }
  }, []);

  const killTweens = useCallback(() => {
    if (containerRef.current) {
      const elements = containerRef.current.querySelectorAll(selector);
      elements.forEach((el) => gsap.killTweensOf(el));
    }
  }, [containerRef, selector]);

  const createSplit = useCallback(() => {
    cleanup();
    killTweens();

    if (!containerRef.current) return null;

    const elements = containerRef.current.querySelectorAll(selector);
    if (elements.length === 0) return null;

    splitRef.current = new SplitText(elements, {
      type: options?.type || "lines",
      linesClass: options?.linesClass || "split-line",
    });
    return splitRef.current;
  }, [cleanup, killTweens, containerRef, selector, options]);

  const animateIn = useCallback(
    (duration = 0.6, stagger = 0.05, ease = "power2.out") => {
      const split = createSplit();
      if (!split?.lines) return gsap.timeline();

      return gsap.from(split.lines, {
        y: 100,
        opacity: 0,
        stagger,
        duration,
        ease,
      });
    },
    [createSplit]
  );

  const animateOut = useCallback(
    (duration = 0.5, stagger = 0.04, ease = "power2.in") => {
      const split = splitRef.current;
      if (!split?.lines) return gsap.timeline();

      return gsap.to(split.lines, {
        y: -80,
        opacity: 0,
        stagger,
        duration,
        ease,
      });
    },
    []
  );

  useEffect(() => {
    return () => {
      cleanup();
      killTweens();
    };
  }, [cleanup, killTweens]);

  return { createSplit, animateIn, animateOut, cleanup, killTweens, splitRef };
}