"use client";
import { MainLogo } from "@/components/reusable/MainLogo";
import React, { useState } from "react";
import { MobileMenu } from "./MobileMenu";

export const MobileMainLogo = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Logo - Desktop: links to home, Mobile: opens menu */}
      <div
        onClick={() => {
            setIsMobileMenuOpen(!isMobileMenuOpen);
            document.body.style.overflow = !isMobileMenuOpen ? 'hidden' : 'auto';
        }}
        className="w-max h-max md:hidden cursor-pointer"
      >
        <MainLogo className="w-10" />
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpened={isMobileMenuOpen}
        onClose={() => {
            setIsMobileMenuOpen(false);
            document.body.style.overflow = 'auto';
        }}
      />
    </>
  );
};
