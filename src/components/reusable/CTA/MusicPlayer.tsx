"use client";
import { useEffect, useRef, useState } from "react";
import { BottomPart, LeftPart, RightPart } from "../OverlayForMusicPlayer";

export const MusicPlayer = () => {
  const audioBoxRef = useRef<HTMLDivElement>(null!);
  const [activeZone, setActiveZone] = useState<
    "bottom" | "right" | "left" | null
  >("bottom");
  const [overlayVisible, setOverlayVisible] = useState("");
  const rightPartRef = useRef<HTMLDivElement>(null!);
  const leftPartRef = useRef<HTMLDivElement>(null!);
  const bottomPartRef = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    if (overlayVisible === "bottom") {
      bottomPartRef.current.classList.add("overlay-active");
    } else if (overlayVisible === "right") {
      rightPartRef.current.classList.add("overlay-active");
    } else if (overlayVisible === "left") {
      leftPartRef.current.classList.add("overlay-active");
    }
  }, [overlayVisible]);

  useEffect(() => {
    const audioBox = audioBoxRef.current;
    if (!audioBox) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    let rafId: number | null = null;
    let portionOfViewportWidth = window.innerWidth / 5; // 20% de la ventana
    let portionOfViewportHeight = window.innerHeight / 3; // 33% de la ventana
    let preventDragStartHandler: (e: Event) => void;

    // --- helpers performance ---
    const disableTransitions = () => {
      audioBox.style.transition = "none";
      audioBox.style.willChange = "transform, left, top";
    };

    const enableTransitions = () => {
      audioBox.style.transition = "";
      audioBox.style.willChange = "auto";
    };

    // Extra helper para obtener coords desde mouse o touch
    const getClientXY = (event: MouseEvent | TouchEvent) => {
      if ("touches" in event && event.touches.length) {
        console.log("X en touch");
        console.log(event.touches[0].clientX);
        console.log("Y en touch");
        console.log(event.touches[0].clientY);
        return { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }

      console.log("X en mousemove");
      console.log((event as MouseEvent).clientX);
      console.log("Y en mousemove");
      console.log((event as MouseEvent).clientY);
      // @ts-ignore (MouseEvent)
      return {
        x: (event as MouseEvent).clientX,
        y: (event as MouseEvent).clientY,
      };
    };

    // Convierte el elemento centrado (left:50% + translateX(-50%)) a left/top absoluta
    const ensureAbsolutePosition = () => {
      const computedStyle = window.getComputedStyle(audioBox);
      const transform = computedStyle.transform;
      // Si el elemento aún usa transform para centrar, convertimos a left/top fijos
      const rect = audioBox.getBoundingClientRect();
      // fijar left/top en px basados en rect
      audioBox.style.left = `${rect.left}px`;
      audioBox.style.top = `${rect.top}px`;
      // limpiar transform que causaría conflictos
      audioBox.style.transform = "";
    };

    const startDrag = (event: MouseEvent | TouchEvent) => {
      const initialOverlay = bottomPartRef.current;

      // prevenir scroll o selección
      event.preventDefault();

      ensureAbsolutePosition();

      isDragging = true;
      disableTransitions();

      setOverlayVisible("bottom");

      audioBox.classList.add("rounded-bl-2xl", "rounded-br-2xl", "z-50");
      audioBox.style.cursor = "grabbing";

      const { x, y } = getClientXY(event);
      const rect = audioBox.getBoundingClientRect();

      // offset = punto donde hice click relativo a la esquina superior-izq del box
      offsetX = x - rect.left;
      offsetY = y - rect.top;
    };

    const onDrag = (event: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      event.preventDefault();
      event.stopPropagation();
      const { x, y } = getClientXY(event);
      const boxRect = audioBox.getBoundingClientRect();
      const boxWidth = boxRect.width;

      //obtener las boundaries de cada overlay para activar el overlay correspondiente, dependiendo de la posicion del grab.
      

      // Usar requestAnimationFrame para optimizar repaints
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        const newX = x - offsetX;
        const newY = y - offsetY;

        const maxX = window.innerWidth - audioBox.offsetWidth + boxWidth / 2;
        const maxY = window.innerHeight - audioBox.offsetHeight;

        const clampedX = Math.max(-(boxWidth / 2), Math.min(newX, maxX));
        const clampedY = Math.max(0, Math.min(newY, maxY));

        // Detectar zona
        const nearLeft = x < portionOfViewportWidth;
        const nearRight = x > window.innerWidth - portionOfViewportWidth;
        const nearBottom = y > window.innerHeight - portionOfViewportHeight;

        if (nearBottom) setActiveZone("bottom");
        else if (nearLeft) setActiveZone("left");
        else if (nearRight) setActiveZone("right");

        // Mover box
        audioBox.style.left = `${clampedX}px`;
        audioBox.style.top = `${clampedY}px`;
      });
    };

    const endDrag = (event?: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      if (event) event.preventDefault();

      isDragging = false;
      enableTransitions();

      const boxRect = audioBox.getBoundingClientRect();

      if (activeZone === "bottom") {
        audioBox.style.left = "50%";
        audioBox.style.transform = "translateX(-50%)";
        audioBox.style.top = `${window.innerHeight - boxRect.height}px`;
      } else if (activeZone === "right") {
        audioBox.style.left = `${window.innerWidth - boxRect.width}px`;
        audioBox.style.top = `${window.innerHeight - boxRect.height}px`;
        audioBox.style.transform = "";
      } else if (activeZone === "left") {
        audioBox.style.left = `0px`;
        audioBox.style.top = `${window.innerHeight - boxRect.height}px`;
        audioBox.style.transform = "";
      }

      setOverlayVisible('');

      audioBox.classList.remove("rounded-bl-2xl", "rounded-br-2xl", "z-50");
      audioBox.style.cursor = "grab";

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    // --- listeners ---
    const onMouseDown = (e: MouseEvent) => startDrag(e);
    const onMouseMove = (e: MouseEvent) => onDrag(e);
    const onMouseUp = (e: MouseEvent) => endDrag(e);

    const onTouchStart = (e: TouchEvent) => startDrag(e);
    const onTouchMove = (e: TouchEvent) => onDrag(e);
    const onTouchEnd = (e: TouchEvent) => endDrag(e);

    // prevenir drag nativo (referencia guardada para remover correctamente)
    preventDragStartHandler = (e: Event) => e.preventDefault();

    audioBox.addEventListener("mousedown", onMouseDown, { passive: false });
    window.addEventListener("mousemove", onMouseMove, { passive: false });
    window.addEventListener("mouseup", onMouseUp, { passive: false });

    audioBox.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: false });

    audioBox.addEventListener("dragstart", preventDragStartHandler);

    // Cleanup
    return () => {
      if (rafId) cancelAnimationFrame(rafId);

      audioBox.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      audioBox.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);

      audioBox.removeEventListener("dragstart", preventDragStartHandler);
    };
  }, []);

  return (
    <>
      <div
        ref={audioBoxRef}
        className="music-player-container cursor-grab fixed bottom-0 left-1/2 min-w-60 h-20 bg-white rounded-tl-2xl rounded-tr-2xl shadow-lg flex items-center justify-center gap-2 select-none touch-none"
        style={{
          // Lo centramos inicialmente con left 50% y transform; al iniciar el primer drag
          // convertimos a left/top absolutos para evitar sobrescribir transforms.
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "0px",
          position: "fixed",
          backfaceVisibility: "hidden",
          perspective: 1000,
        }}
      >
        <div className=" w-[60%] h-full flex items-center justify-center">
          <div className="relative w-3/4 h-3/4 rounded-xl">
            <img
              src="/images/zara-music.webp"
              alt="zara"
              className="w-full rounded-xl h-full object-cover"
            />
            <div className="bg-black/30 absolute inset-0 rounded-xl" />
          </div>
        </div>
        <div className=" w-full h-full flex font-nanum flex-col items-start justify-center gap-0.5 ">
          <p className="text-base">Zara house mix 1</p>
          <p className="text-xs text-black/65">Lewierzoren</p>
        </div>
      </div>
      <BottomPart bottomPartRef={bottomPartRef} />
      <RightPart rightPartRef={rightPartRef} />
      <LeftPart leftPartRef={leftPartRef} />
    </>
  );
};
