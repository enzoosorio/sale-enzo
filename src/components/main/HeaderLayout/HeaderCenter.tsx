"use client";

import { useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HomeSearchDock } from "@/components/search/HomeSearchDock";

/** Center of the header: the logo everywhere, plus the docking search bar on /home. */
export const HeaderCenter = ({ children }: { children: ReactNode }) => {
  const logoRef = useRef<HTMLDivElement>(null);
  const isHome = usePathname() === "/home";

  return (
    <>
      <div ref={logoRef} className="hidden md:block">{children}</div>
      {isHome ? <HomeSearchDock logoRef={logoRef} /> : null}
    </>
  );
};
