"use client";

import { useGSAP } from "@gsap/react";
import { LinkForFooter } from "./LinkForFooter";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export const Footer = () => {
  const links = [
    { name: "Términos y condiciones", href: "#" },
    { name: "Política de privacidad", href: "#" },
    { name: "Contacto", href: "#" },
    { name: "Términos y condiciones", href: "#" },
  ];

  useGSAP(() => {
    ScrollTrigger.create({
      trigger: ".footer",
      start: "top +=500",
      end: "+=400 bottom",
      markers: true,
      onUpdate: (self) => {
        const progress = self.progress;
        const backgroundColor = gsap.utils.interpolate(
          "#FAF9F6",
          "#221C1C",
          progress
        );
        const textColor = gsap.utils.interpolate(
          "#221C1C",
          "#FAF9F6",
          progress
        );
        gsap.to(".footer", {
          backgroundColor,
          duration: 0.3,
          ease: "power2.out",
        });
        gsap.to(".footer .text-color", {
          color: textColor,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    });
  }, []);

  return (
    <section className="footer flex flex-col items-start bg-off-white justify-between w-full py-16 pl-16 pr-20 gap-4 min-h-[600px]">
      {/* parte de arriba */}
      <div className="flex items-start justify-between w-full ">
        <h4 className="text-color font-prata text-[8rem] text-black">Sale</h4>
        <ul className="flex flex-col items-start justify-start gap-6 pr-0 pt-8 text-base font-light font-prata">
          {links.map((link, index) => (
            <LinkForFooter key={index} href={link.href} name={link.name} />
          ))}
        </ul>
      </div>
      {/* parte de abajo */}
      <div className="flex items-start justify-between w-full ">
        <ul className="">
          <li className="text-off-white text-left font-nanum text-base">
            Creado por Enzo Osorio.
          </li>
          <li className="text-off-white text-left font-nanum text-base">
            Productos con historia, listos para una segunda oportunidad.
          </li>
        </ul>
        <ul className="">
          <li className="text-off-white text-left font-nanum text-base">
            Tecnología, diseño y un poco de obsesión por hacerlo bien.
          </li>
          <li className="text-off-white text-right font-nanum text-base">
            La IA ayuda. La intención es humana.
          </li>
        </ul>
      </div>
    </section>
  );
};
