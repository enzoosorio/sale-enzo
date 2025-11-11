"use client";
import { useRef } from "react";
import { Microphone } from "../svgs/Mic";
import { Overlay } from "../Overlay";

export const SuperBarraBusqueda = () => {
  const barraBusquedaRef = useRef<HTMLFormElement>(null!);

  const toggleBackgroundOverlay = (action : string) => {
    const overlayElement = document.querySelector('.overlay-element') as HTMLElement;
    if (overlayElement) {
        if (action === 'show') {   
            overlayElement.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            overlayElement.style.zIndex = '10';
        } else if (action === 'hide') {
            overlayElement.style.backgroundColor = 'rgba(0, 0, 0, 0)';
            overlayElement.style.zIndex = '-10';
        }
    }
  }


  return (
    <>
    <form
      ref={barraBusquedaRef}
      className="absolute top-0 left-1/2 -translate-x-1/2 bg-white z-10 w-1/2 mx-auto focus:shadow-2xl focus-within:shadow-xl transition-shadow h-10 shadow-lg flex items-center justify-between"
    >
      <input 
      onFocus={() => {
        toggleBackgroundOverlay('show')
        document.body.style.overflow = 'hidden';
      }}
      onBlur={() => {
        toggleBackgroundOverlay('hide')
        document.body.style.overflow = 'auto';
      }}
      type="text" className="flex-1 h-full px-4  border font-nanum  outline-black/50 " />
      <Microphone barraBusquedaRef={barraBusquedaRef } />
    </form>
    <Overlay/>
    </>
  );
};
