"use client";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export const Logo = () => {
//   useGSAP(() => {
//     gsap.fromTo(
//       ".logo-text",
//       {
//         opacity: 0,
//         y: -100,
//       },
//       {
//         opacity: 1,
//         y: 0,
//         duration: 1.5,
//         ease: "power2.out",
//       }
//     );
//   }, []);

  return (
    <div className="logo absolute overflow-hidden text-2xl font-bold font-nanum top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <p className="logo-text">
        SALE <span className="text-xs">ENZO</span>
      </p>
    </div>
  );
};
