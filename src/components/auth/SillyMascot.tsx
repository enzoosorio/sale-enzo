"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { DotLottieWorker, RenderConfig } from "@lottiefiles/dotlottie-react";
import { useMascotStore } from "@/store/mascotStore";

const SILLYE_SRC = "/lottie/sillye.lottie";
const SILLYE_WASM = "/lottie/dotlottie-player.wasm";
const SILLYE_FALLBACK = "/svgs/sillye/nav-animation/syllie-3d-idle.svg";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// Player JS + WASM stay out of the initial bundle; the static SVG covers first paint.
// The worker variant rasterizes on an OffscreenCanvas in a Web Worker, so Sillye's frames
// never compete with typing, scrolling or form work on the main thread.
// The WASM is self-hosted (copied to public/lottie by scripts/build-worker.mjs) so a blocked or
// slow jsdelivr/unpkg can't leave a phone stuck on the static head. It must be set before the
// first player is constructed.
const DotLottieWorkerReact = dynamic(
  () =>
    import("@lottiefiles/dotlottie-react").then((mod) => {
      mod.setWasmUrl(new URL(SILLYE_WASM, window.location.origin).href);
      return mod.DotLottieWorkerReact;
    }),
  { ssr: false },
);

// The canvas backing store is its on-screen size x DPR. Sillye is a large, soft background
// figure, so a low DPR cap keeps each frame's raster cost small without visible blur.
const RENDER_CONFIG: RenderConfig = {
  devicePixelRatio: typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio, 1.25),
  freezeOnOffscreen: true,
  autoResize: true,
};

const isFormField = (target: EventTarget | null) =>
  target instanceof HTMLElement && target.matches("input, textarea, select");

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Sillye's head, animated by the dotLottie state machine authored in Lottie Creator.
 * Inputs: `emailFocused` (any form field focused) / `loading` (booleans), events: `fail` / `success`.
 * The canvas never takes pointer events, so it can't block scrolling or clicks behind it.
 * Renders the static idle SVG until the player is ready, on load errors and for reduced motion.
 */
export function SillyMascot({ className = "" }: { className?: string }) {
  const [dotLottie, setDotLottie] = useState<DotLottieWorker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );

  // Any focused form field in the auth layout (login, register...) makes Sillye look at it.
  useEffect(() => {
    const { setInputFocused } = useMascotStore.getState();
    const onFocusIn = (e: FocusEvent) => {
      if (isFormField(e.target)) setInputFocused(true);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!isFormField(e.relatedTarget)) setInputFocused(false);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      setInputFocused(false);
    };
  }, []);

  // Start the state machine once the file is loaded, then mirror the store into its inputs.
  useEffect(() => {
    if (!dotLottie) return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const onLoad = async () => {
      // A state machine that can't start would otherwise leave the static head forever, silently.
      const fail = (reason: string) => {
        if (cancelled) return;
        console.warn(`[SillyMascot] ${reason}; falling back to the static head`);
        setHasFailed(true);
      };
      const machineId = dotLottie.manifest?.stateMachines?.[0]?.id;
      if (!machineId) return fail("no state machine in the .lottie file");
      if (!(await dotLottie.stateMachineLoad(machineId))) return fail("state machine failed to load");
      if (!(await dotLottie.stateMachineStart())) return fail("state machine failed to start");
      if (cancelled) return;

      const { inputFocused, loading } = useMascotStore.getState();
      await dotLottie.stateMachineSetBooleanInput("emailFocused", inputFocused);
      await dotLottie.stateMachineSetBooleanInput("loading", loading);
      if (cancelled) return;
      setIsReady(true);

      // Plain subscribe (not effects) keeps event/input order, e.g. `fail` before `loading=false`.
      // Worker calls are posted in order, so firing without awaiting preserves that sequence.
      unsubscribe = useMascotStore.subscribe((state, prev) => {
        if (state.lastEvent && state.lastEvent !== prev.lastEvent) {
          void dotLottie.stateMachineFireEvent(state.lastEvent.name);
        }
        if (state.inputFocused !== prev.inputFocused) {
          void dotLottie.stateMachineSetBooleanInput("emailFocused", state.inputFocused);
        }
        if (state.loading !== prev.loading) {
          void dotLottie.stateMachineSetBooleanInput("loading", state.loading);
        }
      });
    };
    const onLoadError = () => setHasFailed(true);

    dotLottie.addEventListener("load", onLoad);
    dotLottie.addEventListener("loadError", onLoadError);
    if (dotLottie.isLoaded) void onLoad();

    return () => {
      cancelled = true;
      unsubscribe?.();
      dotLottie.removeEventListener("load", onLoad);
      dotLottie.removeEventListener("loadError", onLoadError);
    };
  }, [dotLottie]);

  const showPlayer = !reducedMotion && !hasFailed;

  return (
    // Below `sm` the box and canvas are sized to what is actually shown (no CSS scale), so the
    // canvas backing store stays small on phones; sm and up keep the original large layout.
    <div className={`w-[345px] h-[226px] sm:w-[1077px] sm:h-[705px] ${className}`}>
      {/* Static idle head: first paint, error and reduced-motion fallback */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SILLYE_FALLBACK}
        alt=""
        aria-hidden
        className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-300 ${
          showPlayer && isReady ? "opacity-0" : "opacity-100"
        }`}
      />
      {showPlayer && (
        // The Lottie canvas is square with the head at ~81% width, so it overflows the head box.
        <DotLottieWorkerReact
          // The worker fetches the file itself, so it needs an absolute URL (this player
          // only mounts client-side; the server render never reaches the worker).
          src={
            typeof window === "undefined"
              ? SILLYE_SRC
              : new URL(SILLYE_SRC, window.location.origin).href
          }
          workerId="sillye"
          autoplay
          // Authored at 30fps: interpolating up to the display refresh rate (60-144Hz) would
          // multiply raster work for no visible gain on these motions.
          useFrameInterpolation={false}
          renderConfig={RENDER_CONFIG}
          dotLottieRefCallback={setDotLottie}
          aria-label="Sillye"
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[424px] h-[424px] sm:w-[1325px] sm:h-[1325px] pointer-events-none transition-opacity duration-300 ${
            isReady ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
