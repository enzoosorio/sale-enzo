// MusicPlayer.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { BottomPart, LeftPart, RightPart } from "../../OverlayForMusicPlayer";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ViniloSkeleton } from "@/components/reusable/CTA/MusicPlayer/ViniloSkeleton";
import { Hamburguer } from "@/components/reusable/svgs/Hamburguer";
import { Song, songsBlank } from "@/lib/songs-blank";
import { MouseWheel } from "../../svgs/MouseWheel";

gsap.registerPlugin(useGSAP);
export const MusicPlayer = () => {
  const audioBoxRef = useRef<HTMLDivElement>(null!);
  const bottomPartRef = useRef<HTMLDivElement>(null!);
  const rightPartRef = useRef<HTMLDivElement>(null!);
  const leftPartRef = useRef<HTMLDivElement>(null!);
  const mainBoxPlayerRef = useRef<HTMLDivElement>(null!);

  const audioRef = useRef<HTMLAudioElement>(null!);
  const containerUIAudioRef = useRef<HTMLDivElement>(null!);
  const buttonMenuRef = useRef<HTMLButtonElement>(null!);
  const menuRef = useRef<HTMLUListElement>(null!);
  const musicProgressRef = useRef<HTMLDivElement>(null!);

  const [activeSong, setActiveSong] = useState<Song>(songsBlank[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [firstSongLoaded, setFirstSongLoaded] = useState<boolean>(false);
  const [isMenuSongsOpen, setIsMenuSongsOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isDraggingProgress, setIsDraggingProgress] = useState<boolean>(false);
  const [isFirstTimeSidesZones, setIsFirstTimeSidesZones] = useState<boolean>(true);

  // estado visual (solo para render)
  const [activeZone, setActiveZone] = useState<
    "bottom" | "right" | "left" | null
  >("bottom");

  // refs mutables para no romper listeners
  const isDraggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const posRef = useRef({ left: 0, top: 0 }); // posición actual en px (sin transform)

  useGSAP(() => {
    let tl = gsap.timeline();
    const audiobox = audioBoxRef.current;
    const mainBoxPlayer = mainBoxPlayerRef.current;
    const menuList = menuRef.current;

    if (!audiobox || !mainBoxPlayer) return;

    const mainBoxHeight = mainBoxPlayer.offsetHeight; // Altura del main-box-player
    const menuHeight = 256; // max-h-64 = 256px

    // Calcular altura total cuando el menú está abierto
    const fullHeight = mainBoxHeight + menuHeight;

    if (isMenuSongsOpen && activeZone === "bottom") {
      // Abrir menú: expandir altura y mover hacia arriba
      tl.to(
        audiobox,
        {
          height: fullHeight,
          ease: "power2.out",
          duration: 0.4,
        },
        0
      );
      tl.to(
        audiobox,
        {
          y: `-${menuHeight}px`,
          ease: "power2.out",
          duration: 0.4,
        },
        0
      );
    } else {
      // Cerrar menú: colapsar a altura del main-box-player
      tl.to(
        audiobox,
        {
          height: mainBoxHeight,
          marginBottom: 150,
          ease: "power2.out",
          duration: 0.4,
        },
        0
      );
      tl.to(
        mainBoxPlayer,
        {
          paddingBottom: 24,
          ease: "power2.out",
          duration: 0.4,
        },
        0
      );
      tl.to(
        audiobox,
        {
          y: 0,
          ease: "power2.out",
          duration: 0.4,
        },
        0
      );
    }
  }, [isMenuSongsOpen, activeZone]);

  useGSAP(() => {
    // Solo mostrar overlay cuando esté en sides y sea la primera vez
    if (activeZone !== "left" && activeZone !== "right") return;
    if (!isFirstTimeSidesZones) return;

    const tl = gsap.timeline({
      onComplete: () => {
        // Después de la animación, marcar como ya visto
        setIsFirstTimeSidesZones(false);
      }
    });

    // Fade in: mostrar overlay
    tl.to('.overlay-wheel', {
      opacity: 1, 
      zIndex: 20,
      duration: 0.4,
      ease: "power2.out",
    }, 0);

    // Esperar 2 segundos para que el usuario vea el indicador
    tl.to('.overlay-wheel', {
      opacity: 1,
    }, "+=2");

    // Fade out: ocultar overlay
    tl.to('.overlay-wheel', {
      opacity: 0,
      duration: 0.5,
      ease: "power2.in",
    });

    // Cambiar z-index después del fade out
    tl.to('.overlay-wheel', {
      zIndex: -20,
      duration: 0,
    });

  }, [activeZone, isFirstTimeSidesZones])

  // Animaciones GSAP según activeZone
  useGSAP(() => {
    const box = audioBoxRef.current;
    const mainBoxPlayer = mainBoxPlayerRef.current;
    const sideAudioImage = box?.querySelector(".image-side-audio-box") as HTMLElement;

    if (!box || !mainBoxPlayer) return;

    const mainBoxHeight = mainBoxPlayer.offsetHeight; // Altura fija del main-box
    const imageWidth = 80; // w-20 = 80px
    const fullWidth = 384; // 24rem = 384px

    let tl = gsap.timeline();

    if (activeZone === "bottom") {
      // Bottom: mostrar contenido completo, border radius arriba
      tl.to(
        box,
        {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 0,
          borderBottomLeftRadius: 0,
          width: fullWidth,
          height: isMenuSongsOpen ? mainBoxHeight + 256 : mainBoxHeight,
          duration: 0.3,
          ease: "power2.out",
        },
        0
      );
      tl.to(
        ".image-side-audio-box",
        {
          width: "5rem",
          duration: 0.3,
        },
        0
      );
    } else if (activeZone === "left" || activeZone === "right") {
      // Sides: minimizar a tamaño de imagen, border radius visible
      // Cerrar menú automáticamente en zonas laterales
      if (isMenuSongsOpen) {
        setIsMenuSongsOpen(false);
      }

      tl.to(
        box,
        {
          borderTopLeftRadius: activeZone === "left" ? 0 : 16,
          borderBottomRightRadius: activeZone === "left" ? 16 : 0,
          borderTopRightRadius: activeZone === "right" ? 0 : 16,
          borderBottomLeftRadius: activeZone === "right" ? 16 : 0,
          width: imageWidth,
          height: mainBoxHeight,
          duration: 0.3,
          ease: "power2.out",
        },
        0
      );
      tl.to(
        ".image-side-audio-box",
        {
          width: "100%",
          duration: 0.3,
        },
        0
      );
    }
  }, [activeZone, isMenuSongsOpen]);

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
      const musicProgressClick = musicProgressRef.current;
      // evitar drag si el click es sobre el contenido interactivo
      if (
        (uiContentClick && uiContentClick.contains(e.target as Node)) ||
        (buttonMenuClick && buttonMenuClick.contains(e.target as Node)) ||
        (menuClick && menuClick.contains(e.target as Node)) ||
        (musicProgressClick && musicProgressClick.contains(e.target as Node))
      ) {
        return;
      }
      e.preventDefault();
      disableTransitions();
      isDraggingRef.current = true;
      box.classList.add("z-50");
      box.style.cursor = "grabbing";

      // Cerrar menú al iniciar drag
      setIsMenuSongsOpen(false);

      const { x, y } = getClientXY(e);
      const rect = box.getBoundingClientRect();

      // Calcular offset solo con la altura del main-box-player (sin el menú)
      // Esto evita que el offset incluya el área del menú oculto
      const mainBox = box.querySelector(".main-box-player") as HTMLElement;
      const mainBoxHeight = mainBox?.offsetHeight || 100; // altura del main-box solo

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

      // Usar solo la altura del main-box-player para cálculos
      const mainBox = box.querySelector(".main-box-player") as HTMLElement;
      const boxH = mainBox?.offsetHeight || 100;

      const clampedLeft = Math.max(
        -boxW / 3,
        Math.min(newLeft, window.innerWidth - boxW)
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

      const contentWrapper = box.querySelector(
        ".content-wrapper"
      ) as HTMLElement;
      const eachSongContent = box.querySelectorAll(
        ".each-song-content"
      ) as NodeListOf<HTMLElement>;
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
      if (minD === dBottom && dBottom < threshold) {
        picked = "bottom";
        contentWrapper.style.display = "flex";
        eachSongContent.forEach((el) => (el.style.display = "flex"));
        buttonMenuRef.current!.style.display = "block";
      } else if (minD === dLeft && dLeft < threshold) {
        picked = "left";
        contentWrapper.style.display = "none";
        eachSongContent.forEach((el) => (el.style.display = "none"));
        buttonMenuRef.current!.style.display = "none";
      } else if (minD === dRight && dRight < threshold) {
        picked = "right";
        contentWrapper.style.display = "none";
        eachSongContent.forEach((el) => (el.style.display = "none"));
        buttonMenuRef.current!.style.display = "none";
      }

      setOverlayClass(picked);
      // solo actualizar cuando cambia para evitar parpadeo
      if (picked !== activeZone) {
        setActiveZone(picked);
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

      // Usar solo altura del main-box-player
      const mainBox = box.querySelector(".main-box-player") as HTMLElement;
      const contentWrapper = box.querySelector(
        ".content-wrapper"
      ) as HTMLElement;
      const eachSongContent = box.querySelectorAll(
        ".each-song-content"
      ) as NodeListOf<HTMLElement>;
      const height = mainBox?.offsetHeight || 100;

      // Limpiar propiedades de posicionamiento conflictivas
      box.style.bottom = "auto";


      if (activeZone === "left") {
        const left = 0;
        const top = Math.round((window.innerHeight - height) / 2);
        posRef.current = { left, top };
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.transform = "";
        contentWrapper.style.display = "none";
        eachSongContent.forEach((el) => (el.style.display = "none"));
        setActiveZone("left");
      } else if (activeZone === "right") {
        const left = Math.round(window.innerWidth - width);
        const top = Math.round((window.innerHeight - height) / 2);
        posRef.current = { left, top };
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.transform = "";
        contentWrapper.style.display = "none";
        eachSongContent.forEach((el) => (el.style.display = "none"));
        setActiveZone("right");
      } else {
        // bottom or null => bottom center
        const left = Math.round(window.innerWidth / 2 - width / 2);
        const top = Math.round(window.innerHeight - height); // 20px margen del bottom
        posRef.current = { left, top };
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.transform = "";
        contentWrapper.style.display = "flex";
        eachSongContent.forEach((el) => (el.style.display = "flex"));
        setActiveZone("bottom");
      }

      // limpiar overlays
      clearOverlays();

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

  // Posicionamiento inicial en bottom center usando top/left
  useEffect(() => {
    const box = audioBoxRef.current;
    if (!box) return;

    // Esperar un frame para que el elemento esté renderizado
    requestAnimationFrame(() => {
      const mainBox = box.querySelector(".main-box-player") as HTMLElement;
      const height = mainBox?.offsetHeight || 100;
      const width = box.offsetWidth || 384;

      const left = Math.round(window.innerWidth / 2 - width / 2);
      const top = Math.round(window.innerHeight - height);

      box.style.bottom = "auto"; // Remover bottom
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      posRef.current = { left, top };
    });
  }, []);

  // Track audio progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (!isDraggingProgress) {
        setCurrentTime(audio.currentTime);
      }
    };

    const updateDuration = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
    };
  }, [isDraggingProgress]);

  const playAudio = async () => {
    try {
      await audioRef.current?.play();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };
  
  const pauseAudio = () => audioRef.current?.pause();

  // Auto-play cuando cambia la canción activa
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = async () => {
      if (isPlaying) {
        try {
          await audio.play();
        } catch (error) {
          console.error('Error playing audio:', error);
        }
      }
    };

    // Esperar a que el audio esté listo para reproducir
    audio.addEventListener('canplaythrough', handleCanPlay);
    
    // Forzar carga del nuevo audio
    audio.load();

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
    };
  }, [activeSong, isPlaying]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingProgress) return;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;
    setCurrentTime(newTime);
  };

  const handleProgressDragEnd = () => {
    if (isDraggingProgress && audioRef.current) {
      audioRef.current.currentTime = currentTime;
      setIsDraggingProgress(false);
    }
  };

  // Wheel navigation for side zones (left/right)
  useEffect(() => {
    const box = audioBoxRef.current;
    if (!box) return;

    const handleWheel = (e: WheelEvent) => {
      // Solo activar wheel navigation en zonas laterales
      if (activeZone === 'bottom') return;
      
      e.preventDefault();
      e.stopPropagation();

      const currentIndex = songsBlank.findIndex(song => song.id === activeSong.id);
      // deltaY > 0 = scroll down = next song
      // deltaY < 0 = scroll up = previous song
      if (e.deltaY > 0) {
        // Next song
        const nextIndex = (currentIndex + 1) % songsBlank.length;
        setActiveSong(songsBlank[nextIndex]);
        setIsPlaying(true);
      } else if (e.deltaY < 0) {
        // Previous song
        const prevIndex = currentIndex === 0 ? songsBlank.length - 1 : currentIndex - 1;
        setActiveSong(songsBlank[prevIndex]);
        setIsPlaying(true);
      }
    };

    box.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      box.removeEventListener('wheel', handleWheel);
    };
  }, [activeZone, activeSong]);

  useEffect(() => {
console.log({activeZone})
  }, [activeZone])

  return (
    <>
      <div
        ref={audioBoxRef}
        className={`music-player-container w-96 cursor-grab overflow-hidden 
          fixed gradial-radient 
          shadow-2xl select-none touch-none transition-all`}
        style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}
      >
        {/* primer container con clippy-path mostrando solo main cancion (primera carga) */}
        <div
          ref={mainBoxPlayerRef}
          className="relative main-box-player flex flex-col items-start justify-start w-full gap-1 pb-2"
        >
          {/* Row 1: Image + Info + Menu Button */}
          <div className="flex items-center justify-start w-full gap-2">
            {/* parte de la imagen container*/}
            <div className="relative image-side-audio-box  w-20 h-16 flex items-start justify-center">
              {activeZone !== 'bottom' && isFirstTimeSidesZones && (
            <div className="overlay-wheel absolute inset-0 w-full bg-black/30 h-full pointer-events-none" style={{ opacity: 0, zIndex: -20 }}>
                <MouseWheel className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 animate-pulse text-white/80" />
            </div>
          )}

              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (audioRef.current?.paused) playAudio();
                  else pauseAudio();
                  setIsPlaying(!isPlaying);
                }}
                ref={containerUIAudioRef}
                className="relative cursor-pointer w-20 h-16 flex items-center justify-center overflow-hidden"
              >
                <div
                  className={`${
                    !isPlaying ? "bg-black/20 blur-sm" : "bg-transparent"
                  } transition-all  absolute inset-0`}
                />
                <img
                  src={activeSong.cover}
                  alt="zara"
                  className={`${
                    firstSongLoaded
                      ? "opacity-100 z-0 fade-in"
                      : "opacity-0 -z-20"
                  } absolute inset-0 w-full h-full p-2 object-contain song-cover transition-all playing ${
                    isPlaying ? "resume-spin" : "paused"
                  }`}
                />
                <div
                  className={`absolute ${
                    isMenuSongsOpen
                      ? "overlay-fade-drop-menu-active"
                      : "overlay-fade-drop"
                  } w-16 h-16 left-0 top-0`}
                  style={{ clipPath: "circle(50% at 50% 50%)" }}
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
                  preload="none"
                  className="audio-tag"
                />
              </div>
            </div>
            {/* texto de contenido -- titulo y autor */}
            <div
              className={`content-wrapper transition-all duration-300 ${
                activeZone === "bottom" ? "flex" : "hidden"
              } flex-col items-start flex-1 justify-start gap-0.5 pl-1`}
            >
              <p className="title-audio-box text-sm truncate max-w-full">{activeSong.title}</p>
              <p className="author-audio-box font-prata text-[10px] text-black/75 truncate max-w-full">
                {activeSong.artist}
              </p>
            </div>
            {/* boton para abrir el resto del contenido (distintas canciones) - solo en bottom */}
            <button
              ref={buttonMenuRef}
              className={`cursor-pointer relative transition-all duration-300 ${
                isMenuSongsOpen
                  ? "overlay-fade-drop-menu-active"
                  : "overlay-fade-drop"
              } w-18 h-16 px-4 items-center justify-center ${
                activeZone === "bottom" || activeZone === null ? "flex" : "hidden"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuSongsOpen(!isMenuSongsOpen);
              }}
            >
              <div
                className={`${
                  isMenuSongsOpen ? "bg-black/10 blur-md" : "bg-transparent"
                } transition-all  absolute inset-0`}
              />
              <Hamburguer
                className={`transition-transform duration-300 mx-auto ${
                  isMenuSongsOpen ? "-rotate-90" : "rotate-0"
                }`}
              />
            </button>
          </div>

          {/* Row 2: Progress Bar */}
          <div
            ref={musicProgressRef}
            className={`w-full px-4 mt-2 bg items-center gap-2 cursor-default transition-all duration-300 ${
              activeZone === "bottom" ? "flex" : "hidden"
            }`}
          >
            <span className="text-[10px] font-prata text-black/60 ">
              {formatTime(currentTime)}
            </span>
            <div
              className="flex-1 h-1.5 bg-black/10 rounded-full cursor-pointer mx-2 relative group"
              onClick={handleProgressClick}
              onMouseDown={() => setIsDraggingProgress(true)}
              onMouseMove={handleProgressDrag}
              onMouseUp={handleProgressDragEnd}
              onMouseLeave={handleProgressDragEnd}
            >
              <div
                className="absolute inset-0 bg-linear-to-r from-black/40 to-black/60 rounded-full transition-all"
                style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-black/80 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  left: `calc(${(currentTime / duration) * 100 || 0}% - 6px)`,
                }}
              />
            </div>
            <span className="text-[10px] font-prata text-black/60 min-w-8">
              {formatTime(duration)}
            </span>
          </div>
        </div>
        {/* lista de caniones restantes*/}
        <ul
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className={`music-menu-scrollbar flex flex-col max-h-64 overflow-auto justify-start w-full pr-1`}
        >
          {songsBlank.map((song) => (
            <li
              key={song.id}
              className={`relative w-full cursor-pointer group h-16 flex shadow-[0px_-0.2px_1px_1px_rgba(0,0,0,0.1)] items-center ${
                activeZone === "bottom" ? "justify-start py-8" : "justify-center"
              } gap-2`}
            >
              <div
                className={`bg-black/0 ${
                  activeSong?.id === song.id
                    ? "bg-black/20 blur-md"
                    : "bg-black/0"
                } cursor-pointer absolute inset-0 w-full h-full group-hover:bg-black/10 transition-colors `}
              />
              <div className="cursor-pointer w-20 relative flex items-center justify-center  overflow-hidden">
                <img
                  src={song.cover}
                  alt={song.title}
                  className="w-12 h-12 object-cover rounded"
                />
              </div>
              <div
                className={`each-song-content transition-all duration-300 ${
                  activeZone === "bottom" || activeZone === null ? "flex" : "hidden"
                } flex-col items-start justify-start gap-0.5`}
              >
                <p className="title-audio-box text-sm truncate max-w-[200px]">{song.title}</p>
                <p className="author-audio-box font-prata text-[10px] text-black/75 truncate max-w-[200px]">
                  {song.artist}
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveSong(song);
                  setIsPlaying(true);
                }}
                className="absolute inset-0 z-30 cursor-pointer bg-transparent w-full h-full"
              />
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
