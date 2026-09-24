"use client";
import { MainLogo } from "@/components/reusable/svgs/MainLogo";
import { useEffect, useRef, useState } from "react";
import { MobileMenu } from "./MobileMenu";

export const MobileMainLogo = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = () => setIsMobileMenuOpen(false);
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    const desktop = window.matchMedia("(min-width: 768px)");
    desktop.addEventListener("change", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [isMobileMenuOpen]);
  return <>
    <button ref={buttonRef} type="button" aria-label="Abrir menú" aria-expanded={isMobileMenuOpen}
      onClick={() => setIsMobileMenuOpen(open => !open)} className="w-max h-max md:hidden cursor-pointer">
      <MainLogo className="w-10" />
    </button>
    <MobileMenu isOpened={isMobileMenuOpen} onClose={() => {
      setIsMobileMenuOpen(false);
      buttonRef.current?.focus();
    }} />
  </>;
};
