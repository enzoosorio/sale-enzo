// MusicPlayer.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { BottomPart, LeftPart, RightPart } from "../../OverlayForMusicPlayer";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ViniloSkeleton } from "@/components/reusable/CTA/MusicPlayer/ViniloSkeleton";
import { Hamburguer } from "@/components/reusable/svgs/Hamburguer";
import { Song, songsBlank } from "@/lib/songs-blank";

gsap.registerPlugin(useGSAP);
export const MusicPlayer = () => {
  const audioBoxRef = useRef<HTMLDivElement>(null!);
  const bottomPartRef = useRef<HTMLDivElement>(null!);
  const rightPartRef = useRef<HTMLDivElement>(null!);
  const leftPartRef = useRef<HTMLDivElement>(null!);

  const audioRef = useRef<HTMLAudioElement>(null!);
  const containerUIAudioRef = useRef<HTMLDivElement>(null!);
  const buttonMenuRef = useRef<HTMLButtonElement>(null!);
  const menuRef = useRef<HTMLUListElement>(null!);

  const [activeSong, setActiveSong] = useState<Song>(songsBlank[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [firstSongLoaded, setFirstSongLoaded] = useState<boolean>(false);
  const [isMenuSongsOpen, setIsMenuSongsOpen] = useState<boolean>(false);

  // estado visual (solo para render)
  const [activeZone, setActiveZone] = useState<
    "bottom" | "right" | "left" | null
  >(null);

  // refs mutables para no romper listeners
  const isDraggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const posRef = useRef({ left: 0, top: 0 }); // posición actual en px (sin transform)

  useGSAP(() => {
    let tl = gsap.timeline();

    const audiobox = audioBoxRef.current;

    gsap.set(audiobox, {
      bottom: isMenuSongsOpen ? "0rem" : "-16rem",
    });

    if (isMenuSongsOpen) {
      tl.to(
        audioBoxRef.current,
        {
          clipPath: "inset(0 0 0% 0)",
          // ease: "power2.out",
          duration: 0,
        },
        0
      );
      tl.to(
        audioBoxRef.current,
        {
          bottom: "0rem",
          ease: "power2.out",
          duration: 0.4,
        },
        0.4
      );
    } else {
      tl.to(
        audioBoxRef.current,
        {
          clipPath: "inset(0 0 80% 0)",
          ease: "power2.out",
          duration: 0.2,
        },
        0
      );
      tl.to(
        audioBoxRef.current,
        {
          bottom: "-16rem",
          ease: "power2.out",
          duration: 0.2,
        },
        0.2
      );
    }
  }, [isMenuSongsOpen]);

  // Animaciones GSAP según activeZone
  useGSAP(() => {
    let tl = gsap.timeline();

    if (activeZone === "bottom") {
      tl.to(
        ".content-wrapper",
        {
          x: -5,
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
      tl.to(
        audioBoxRef.current,
        {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 0,
          borderBottomLeftRadius: 0,
        },
        0
      );
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
          minWidth: "240px",
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
      tl.to(
        audioBoxRef.current,
        {
          borderTopLeftRadius: 0,
          borderBottomRightRadius: 16,
          borderTopRightRadius: 16,
          borderBottomLeftRadius: 0,
        },
        0
      );
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
      tl.to(
        audioBoxRef.current,
        {
          borderTopLeftRadius: 16,
          borderBottomRightRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 16,
        },
        0
      );
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
      const buttonMenuClick = buttonMenuRef.current;
      const menuClick = menuRef.current;
      // evitar drag si el click es sobre el contenido interactivo
      if (
        (uiContentClick && uiContentClick.contains(e.target as Node)) ||
        (buttonMenuClick && buttonMenuClick.contains(e.target as Node)) ||
        (menuClick && menuClick.contains(e.target as Node))
      ) {
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

  useEffect(() => {
    //simular carga primera canción
    const timer = setTimeout(() => {
      setFirstSongLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const playAudio = () => audioRef.current?.play();
  const pauseAudio = () => audioRef.current?.pause();

  return (
    <>
      <div
        ref={audioBoxRef}
        className={`music-player-container w-96  cursor-grab overflow-hidden 
          fixed left-1/2 -translate-x-1/2 gradial-radient 
          shadow-2xl rounded-tl-lg rounded-tr-lg select-none touch-none transition-all`}
      >
        {/* primer container con clippy-path mostrando solo main cancion (primera carga) */}
        <div className="main-box-player flex items-center justify-start w-full gap-2">
          {/* parte de la imagen container*/}
          <div className="image-side-audio-box w-20 h-full flex items-center justify-center">
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (audioRef.current?.paused) playAudio();
                else pauseAudio();
                setIsPlaying(!isPlaying);
              }}
              ref={containerUIAudioRef}
              className="cursor-pointer w-20 relative flex items-center justify-center  overflow-hidden"
            >
              <img
                src={activeSong.cover}
                alt="zara"
                className={`${
                  firstSongLoaded
                    ? "opacity-100 z-0 fade-in"
                    : "opacity-0 -z-20"
                } absolute rounded-full inset-0 w-full h-full rounded-tl-xl p-2 object-cover song-cover transition-all playing ${
                  isPlaying ? "resume-spin" : "paused"
                } `}
              />
              <div
                className={`absolute ${
                  isMenuSongsOpen
                    ? "overlay-fade-drop-menu-active"
                    : "overlay-fade-drop"
                } w-20 h-16 left-0 top-0 `}
              />
              <ViniloSkeleton
                className={`transition-all w-16 p-1 ${
                  firstSongLoaded
                    ? "opacity-0 -z-20 fill-black/15 paused"
                    : "opacity-100 z-0 fill-none resume-spin"
                } playing`}
              />
              <audio
                ref={audioRef}
                src={activeSong.audio}
                autoPlay
                preload="none"
                className="audio-tag"
              />
            </div>
          </div>
          {/* texto de contenido -- titulo y autor */}
          <div className="content-wrapper flex flex-col items-start w-full justify-start gap-0.5">
            <p className="title-audio-box text-sm">{activeSong.title}</p>
            <p className="author-audio-box font-prata text-[10px] text-black/75">
              {activeSong.artist}
            </p>
          </div>
          {/* boton para abrir el resto del contenido (distintas canciones) */}
          <button
            ref={buttonMenuRef}
            className={`cursor-pointer ${
              isMenuSongsOpen
                ? "overlay-fade-drop-menu-active"
                : "overlay-fade-drop"
            } w-20 h-16 px-4 flex items-center justify-center `}
            onClick={(e) => {
              console.log("clic");
              e.stopPropagation();
              setIsMenuSongsOpen(!isMenuSongsOpen);
            }}
          >
            <Hamburguer
              className={` ${isMenuSongsOpen ? "-rotate-90" : "rotate-0"}`}
            />
          </button>
        </div>
        {/* lista de caniones restantes*/}
        <ul
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="music-menu-scrollbar flex flex-col max-h-64 overflow-auto justify-start w-full pr-1"
        >
          {songsBlank.map((song) => (
            <li
              key={song.id}
              className="relative w-full cursor-pointer group min-h-16 py-8 flex shadow-[0px_-0.2px_1px_1px_rgba(0,0,0,0.1)] items-center justify-start gap-2"
            >
              <div className="bg-black/0 absolute inset-0 w-full h-full group-hover:bg-black/10 transition-colors " />
              <div className="cursor-pointer w-20 relative flex items-center justify-center  overflow-hidden">
                <img
                  src={song.cover}
                  alt={song.title}
                  className="w-12 h-12 object-cover rounded"
                />
              </div>
              <div className="flex flex-col items-start justify-start gap-0.5">
                <p className="title-audio-box text-sm">{song.title}</p>
                <p className="author-audio-box font-prata text-[10px] text-black/75">
                  {song.artist}
                </p>
              </div>
              <button 
              onClick={() => {
                setActiveSong(song)
                playAudio();
                setIsPlaying(true);
              }}
              className="absolute inset-0 z-30 bg-transparent w-full h-full"/>
            </li>
          ))}
        </ul>
        {/* </div> */}
      </div>

      {/* overlays */}
      <BottomPart bottomPartRef={bottomPartRef} />
      <RightPart rightPartRef={rightPartRef} />
      <LeftPart leftPartRef={leftPartRef} />
    </>
  );
};
