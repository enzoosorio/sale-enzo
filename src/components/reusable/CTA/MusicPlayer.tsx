// MusicPlayer.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { BottomPart, LeftPart, RightPart } from "../OverlayForMusicPlayer";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);
export const MusicPlayer = () => {
  const audioBoxRef = useRef<HTMLDivElement>(null!);
  const bottomPartRef = useRef<HTMLDivElement>(null!);
  const rightPartRef = useRef<HTMLDivElement>(null!);
  const leftPartRef = useRef<HTMLDivElement>(null!);

  const audioRef = useRef<HTMLAudioElement>(null!);
  const containerUIAudioRef = useRef<HTMLDivElement>(null!);

  const [activeSong, setActiveSong] = useState<string>("/songs/alita-comp.mp3");

  // estado visual (solo para render)
  const [activeZone, setActiveZone] = useState<
    "bottom" | "right" | "left" | null
  >(null);

  // refs mutables para no romper listeners
  const isDraggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const posRef = useRef({ left: 0, top: 0 }); // posición actual en px (sin transform)

  // Animaciones GSAP según activeZone 
  useGSAP(() => {
    let tl = gsap.timeline();

    if (activeZone === "bottom") {
      tl.to(
        ".content-wrapper",
        {
          x: -5 ,
          duration: 0.01,
          
        },
        0.2
      );
      tl.to(
        ".content-wrapper",
        {
          opacity: 1,
          duration: 0.1,
          
        },
        0.3
      );
      tl.to(audioBoxRef.current, {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomRightRadius: 0,
        borderBottomLeftRadius: 0,

      },0)
      tl.to(
        ".image-side-audio-box",
        {
          width: "40%",
        },
        0.3
      );
      tl.to(
        ".music-player-container",
        {
          minWidth: '240px',
          width: "auto",
        },
        0.15
      );

    } else if (activeZone === "left") {
      tl.to(
        ".content-wrapper",
        {
          opacity: 0,
          x: -300,
          duration: 0.1,
          
        },
        0
      );
      tl.to(audioBoxRef.current, {
        borderTopLeftRadius: 0,
        borderBottomRightRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 0,

      },0)
      tl.to(
        ".image-side-audio-box",
        {
          width: "100%",
        },
        0.3
      );
      tl.to(
        ".music-player-container",
        {
          minWidth: 0,
          width: "100px",
        },
        0.15
      );
    } else if (activeZone === "right") {
      tl.to(
        ".content-wrapper",
        {
          opacity: 0,
          x: 300,
          duration: 0.1,
          
        },
        0
      );
      tl.to(audioBoxRef.current, {
        borderTopLeftRadius: 16,
        borderBottomRightRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 16,

      },0)
      tl.to(
        ".image-side-audio-box",
        {
          width: "100%",
        },
        0.3
      );
      tl.to(
        ".music-player-container",
        {
          minWidth: 0,
          width: "100px",
        },
        0.15
      );
    }
  }, [activeZone]);

  // Cuando initializamos, centramos en bottom
  useEffect(() => {
    const box = audioBoxRef.current;
    if (!box) return;
    // Inicial: centrar en bottom (igual que tu estilo inicial)
    const rect = box.getBoundingClientRect();
    const initLeft = window.innerWidth / 2 - rect.width / 2;
    const initTop = window.innerHeight - rect.height;
    posRef.current = { left: initLeft, top: initTop };
    box.style.left = `${initLeft}px`;
    box.style.top = `${initTop}px`;
    box.style.transform = ""; // usar left/top absolutos
  }, []);

  useEffect(() => {
    const box = audioBoxRef.current;
    if (!box) return;

    // Helpers
    const disableTransitions = () =>
      (box.style.transition = "all 220ms cubic-bezier(.2,.9,.2,1)");
    const enableTransitions = () =>
      (box.style.transition = "all 220ms cubic-bezier(.2,.9,.2,1)");

    const getClientXY = (e: MouseEvent | TouchEvent) => {
      if ("touches" in e && e.touches.length) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
    };

    // cálculo de distancias a los "targets" (lo que tú llamabas overlays)
    const getTargets = () => {
      // centers where the box should snap to visually
      return {
        bottom: { x: window.innerWidth / 2, y: window.innerHeight }, // bottom center (y at bottom edge)
        left: { x: 0, y: window.innerHeight / 2 },
        right: { x: window.innerWidth, y: window.innerHeight / 2 },
      };
    };

    // distancia euclidiana
    const dist = (x1: number, y1: number, x2: number, y2: number) =>
      Math.hypot(x2 - x1, y2 - y1);

    // Threshold dinámico (evita que se active prematuramente)
    const computeThreshold = () => {
      // 18% del ancho o 18% del alto => adaptativo según pantallas
      return Math.min(window.innerWidth, window.innerHeight) * 0.5;
    };

    // Activa/Desactiva clases overlay en refs
    const clearOverlays = () => {
      [bottomPartRef, leftPartRef, rightPartRef].forEach((r) =>
        r.current?.classList.remove("overlay-active")
      );
    };
    const setOverlayClass = (zone: "bottom" | "left" | "right" | null) => {
      clearOverlays();
      if (!zone) return;
      const map = {
        bottom: bottomPartRef,
        left: leftPartRef,
        right: rightPartRef,
      } as const;
      map[zone].current?.classList.add("overlay-active");
    };

    // start drag
    const startDrag = (e: MouseEvent | TouchEvent) => {
      const uiContentClick = containerUIAudioRef.current;
      // evitar drag si el click es sobre el contenido interactivo
      if (uiContentClick && uiContentClick.contains(e.target as Node)) {
        console.log('drag en el uicontent')
        return;
      }
      e.preventDefault();
      disableTransitions();
      isDraggingRef.current = true;
      box.classList.add("z-50");
      box.style.cursor = "grabbing";

      const { x, y } = getClientXY(e);
      const rect = box.getBoundingClientRect();
      offsetRef.current = { x: x - rect.left, y: y - rect.top };
    };

    // on drag (raf)
    const onMove = (clientX: number, clientY: number) => {
      const newLeft = clientX - offsetRef.current.x;
      const newTop = clientY - offsetRef.current.y;

      // guard positions inside viewport
      // hacer que el box pueda salirse 2/3 fuera de la pantalla horizontalmente
      const rect = box.getBoundingClientRect();
      const boxW = rect.width;
      const boxH = rect.height;
      const clampedLeft = Math.max(
        -boxW / 3,
        Math.min(newLeft, window.innerWidth - boxW / 3)
      );
      const clampedTop = Math.max(
        0,
        Math.min(newTop, window.innerHeight - boxH)
      );

      posRef.current = { left: clampedLeft, top: clampedTop };
      box.style.left = `${clampedLeft}px`;
      box.style.top = `${clampedTop}px`;

      // detectar zona comparando distancia al target centers
      const targets = getTargets();
      const threshold = computeThreshold();

      const dBottom = dist(
        clientX,
        clientY,
        targets.bottom.x,
        targets.bottom.y
      );
      const dLeft = dist(clientX, clientY, targets.left.x, targets.left.y);
      const dRight = dist(clientX, clientY, targets.right.x, targets.right.y);

      // Elegimos la zona con MENOR distancia y que esté por debajo del threshold
      const minD = Math.min(dBottom, dLeft, dRight);
      let picked: "bottom" | "left" | "right" | null = null;
      if (minD === dBottom && dBottom < threshold) picked = "bottom";
      else if (minD === dLeft && dLeft < threshold) picked = "left";
      else if (minD === dRight && dRight < threshold) picked = "right";

      // solo actualizar cuando cambia para evitar parpadeo
      if (picked !== activeZone) {
        setActiveZone(picked);
        setOverlayClass(picked);
      }
    };

    // unified handlers
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const { x, y } = getClientXY(e);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => onMove(x, y));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      const { x, y } = getClientXY(e);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => onMove(x, y));
    };

    const handleMouseUp = (e?: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      if (e) e.preventDefault();
      isDraggingRef.current = false;
      enableTransitions();
      box.classList.remove("z-50");
      box.style.cursor = "grab";

      // Snap final según activeZone (si null -> volver bottom center)
      const rect = box.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (activeZone === "left") {
        const left = 0;
        const top = Math.round((window.innerHeight - height) / 2);
        posRef.current = { left, top };
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.transform = "";
        setActiveZone("left");
      } else if (activeZone === "right") {
        const left = Math.round(window.innerWidth - width);
        const top = Math.round((window.innerHeight - height) / 2);
        posRef.current = { left, top };
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.transform = "";
        setActiveZone("right");
      } else {
        // bottom or null => bottom center
        const left = Math.round(window.innerWidth / 2 - width / 2);
        const top = Math.round(window.innerHeight - height);
        posRef.current = { left, top };
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.transform = "";
        setActiveZone("bottom");
      }

      // limpiar overlays
      clearOverlays();
      setActiveZone(null);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    // Event listeners
    const handleMouseDown = (e: MouseEvent) => startDrag(e);
    const handleTouchStart = (e: TouchEvent) => startDrag(e);

    // bind: mouse & touch
    box.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    box.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleMouseUp);

    // cleanup
    return () => {
      box.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      box.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // intentionally no deps: keep listeners stable and use refs/state updates internally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeZone]); // activeZone watched only to trigger UI updates; core logic uses refs


  const playAudio = () => audioRef.current?.play();
  const pauseAudio = () => audioRef.current?.pause();

  return (
    <>
      <div
        ref={audioBoxRef}
        className="music-player-container cursor-grab overflow-hidden fixed bottom-0 left-1/2 min-w-60 w-auto h-20 bg-white rounded-tl-2xl rounded-tr-2xl shadow-lg flex items-center justify-start gap-2 select-none touch-none transition-all"
        style={{
          left: "50%", // initial fallback; the effect will compute absolute left/top
          transform: "translateX(-50%)",
          bottom: "0px",
          backfaceVisibility: "hidden",
          perspective: 1000,
        }}
      >
        {/* <div> */}
          <div className="image-side-audio-box w-[40%] h-full flex items-center justify-center">
            <div 
            onMouseDown={() => {
              console.log('mouse down')
            }}
            onClick={(e) => {
              console.log('clic')
              e.stopPropagation();
              if (audioRef.current?.paused) playAudio();
              else pauseAudio();
            }}
            ref={containerUIAudioRef}
            className="cursor-pointer relative w-3/4 h-3/4 rounded-xl overflow-hidden">
              <img
                src="/images/zara-music.webp"
                alt="zara"
                className="w-full h-full rounded-xl object-cover"
              />
              <audio 
              ref={audioRef}
              src={activeSong}
              autoPlay
              preload="none"
              className="audio-tag"
              />
              <div className="bg-black/30 absolute inset-0 rounded-xl" />
            </div>
          </div>
          <div className="content-wrapper absolute left-[43%] top-0  w-full h-full flex font-nanum flex-col items-start justify-center gap-0.5">
            <p className="title-audio-box text-base">Zara house mix 1</p>
            <p className="author-audio-box text-xs text-black/65">
              Lewierzoren
            </p>
          </div>
        {/* </div> */}
      </div>

      {/* overlays */}
      <BottomPart bottomPartRef={bottomPartRef} />
      <RightPart rightPartRef={rightPartRef} />
      <LeftPart leftPartRef={leftPartRef} />
    </>
  );
};
