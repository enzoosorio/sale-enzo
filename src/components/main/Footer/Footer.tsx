"use client";

import { useGSAP } from "@gsap/react";
import { LinkForFooter } from "./LinkForFooter";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LEGAL_PAGES, contactWhatsAppUrl } from "@/content/legal";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export const Footer = () => {
  const contactUrl = contactWhatsAppUrl();
  const links = [
    ...LEGAL_PAGES.map((page) => ({ name: page.label, href: page.path, external: false })),
    ...(contactUrl ? [{ name: "Contacto", href: contactUrl, external: true }] : []),
  ];


  useGSAP(() => {
    ScrollTrigger.create({
      trigger: ".footer",
      start: "top +=500",
      end: "+=400 bottom",
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

  // Every text node carries `text-color` so the scroll-driven tween keeps it in contrast with the background.
  return (
    <section className="footer flex flex-col items-start bg-off-white justify-between w-full py-16 px-gutter gap-12 min-h-(--footer-height)">
      {/* parte de arriba */}
      <div className="flex flex-col sm:flex-row items-start justify-between w-full gap-8">
        <h4 className="text-color font-prata text-[clamp(4.5rem,12vw,8rem)] leading-none text-off-black">Sale</h4>
        <ul className="flex flex-col items-start sm:items-end justify-start gap-6 sm:pt-8 text-base font-light font-prata">
          {links.map((link) => (
            <LinkForFooter key={link.href} href={link.href} name={link.name} external={link.external} />
          ))}
        </ul>
      </div>
      {/* parte de abajo */}
      <div className="flex flex-col md:flex-row items-start justify-between w-full gap-4">
        <ul>
          <li className="text-color text-off-black text-left font-nanum text-base">
            Creado por Enzo Osorio.
          </li>
          <li className="text-color text-off-black text-left font-nanum text-base">
            Productos con historia, listos para una segunda oportunidad.
          </li>
        </ul>
        <ul className="md:text-right">
          <li className="text-color text-off-black font-nanum text-base">
            Tecnología, diseño y un poco de obsesión por hacerlo bien.
          </li>
          <li className="text-color text-off-black font-nanum text-base">
            La IA ayuda. La intención es humana.
          </li>
        </ul>
      </div>
    </section>
  );
};
