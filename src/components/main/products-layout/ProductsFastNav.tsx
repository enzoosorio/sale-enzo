import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { finalBackground, initialBackground } from "@/components/main/home/homeAnimations.constants";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export interface ProductsFastNavItem {
  name: string;
  slug: string;
  href: string;
}

interface ProductsFastNavProps {
  items: ProductsFastNavItem[];
  mainItem: ProductsFastNavItem;
  /** Primitive slugs that define which bar is shown; the scroll effect is rebuilt only when they change. */
  categorySlug: string | null;
  subcategorySlug: string | null;
  /** Root of the bar, shared with the parent so the filters toggle can hide it. */
  rootRef: RefObject<HTMLDivElement | null>;
}

const MEDIA = {
  isDesktop: "(min-width: 64rem)",
  isMobile: "(max-width: 63.98rem)",
  reduceMotion: "(prefers-reduced-motion: reduce)",
} as const;

/** Scroll distance (px) over which the title condenses once the bar is pinned. */
const CONDENSE_DISTANCE = 200;

/** Height of the sticky site header, so the pinned bar sits right below it instead of behind it. */
const getHeaderOffset = () => {
  const header = document.querySelector<HTMLElement>("body header");
  if (header) return header.offsetHeight;
  const rootStyle = getComputedStyle(document.documentElement);
  const rem = parseFloat(rootStyle.fontSize) || 16;
  return (parseFloat(rootStyle.getPropertyValue("--navbar-height")) || 5) * rem;
};

export const ProductsFastNav = memo(
  ({ items, mainItem, categorySlug, subcategorySlug, rootRef }: ProductsFastNavProps) => {
    const [carouselApi, setCarouselApi] = useState<CarouselApi>();
    const titleRef = useRef<HTMLHeadingElement>(null);
    const condensedBgRef = useRef<HTMLDivElement>(null);
    const restingBgRef = useRef<HTMLDivElement>(null);
    const otherItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

    const isMainInItems = useMemo(
      () => items.some((item) => item.slug === mainItem.slug),
      [items, mainItem.slug],
    );

    const otherItems = useMemo(() => {
      if (mainItem.slug === "all") return items;
      if (!isMainInItems) return [];
      return items.filter((item) => item.slug !== mainItem.slug);
    }, [isMainInItems, items, mainItem.slug]);

    // Filter changes only rewrite hrefs; the effect must rebuild only when the set of links changes.
    const otherSlugsKey = otherItems.map((item) => item.slug).join("|");

    useEffect(() => {
      carouselApi?.scrollTo(0, false);
    }, [carouselApi, mainItem.slug, otherSlugsKey]);

      useGSAP(
      () => {
        const root = rootRef.current;
        const title = titleRef.current;
        // The bar stays pinned while the products wrapper it is positioned in scrolls past.
        const boundary = root?.parentElement;
        const restingBg = restingBgRef.current;
        const condensedBg = condensedBgRef.current;
        if (!root || !title || !boundary || !restingBg || !condensedBg) return;

        const links = otherItemRefs.current
          .slice(0, otherItems.length)
          .filter((link): link is HTMLAnchorElement => link !== null);
        const pinStart = () => `top top+=${getHeaderOffset()}`;
        const mm = gsap.matchMedia();

        mm.add(MEDIA, (context) => {
          const { isDesktop, reduceMotion } = context.conditions ?? {};
          const endScale = isDesktop ? 0.5 : 0.6;
          // Scale keeps the title's layout box, so the links slide left to close the freed space.
          const closeGap = () => -title.offsetWidth * (1 - endScale);

          ScrollTrigger.create({
            trigger: root,
            start: pinStart,
            endTrigger: boundary,
            end: () => `bottom top+=${getHeaderOffset() + root.offsetHeight}`,
            pin: true,
            pinSpacing: false,
            invalidateOnRefresh: true,
          });

          gsap.set(title, { transformOrigin: "left center" });

          if (reduceMotion) {
            gsap.set(title, { scale: endScale });
            gsap.set([restingBg, condensedBg], { autoAlpha: (index: number) => index });
            if (links.length) gsap.set(links, { x: closeGap, autoAlpha: 1 });
            return;
          }

          const tl = gsap
            .timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: root,
                start: pinStart,
                end: `+=${CONDENSE_DISTANCE}`,
                scrub: 0.5,
                invalidateOnRefresh: true,
              },
            })
            .to(title, { scale: endScale, duration: 1 }, 0)
            .to(restingBg, { autoAlpha: 0, duration: 0.5 }, 0)
            .to(condensedBg, { autoAlpha: 1, duration: 0.5 }, 0);

          if (links.length) {
            tl.to(links, { x: closeGap, duration: 1 }, 0).to(
              links,
              { autoAlpha: 1, duration: 0.4, stagger: 0.1 },
              0.3,
            );
          }
        });

        // Web fonts change the title width that the gap correction depends on.
        document.fonts?.ready.then(() => ScrollTrigger.refresh());
      },
      {
        scope: rootRef,
        dependencies: [categorySlug, subcategorySlug, otherSlugsKey],
        revertOnUpdate: true,
      },
    );

    return (
      <div
        ref={rootRef}
        className="fast-nav-wrapper isolate h-32 absolute w-full z-20 top-20 flex items-center justify-center"
      >
        <div
          ref={restingBgRef}
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: initialBackground }}
        />
        <div
          ref={condensedBgRef}
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none invisible opacity-0 backdrop-blur-lg"
          style={{ background: finalBackground }}
        />
        <Carousel
          opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}
          setApi={setCarouselApi}
          className="min-w-full h-32 flex items-center justify-start"
        >
          <CarouselContent className="flex justify-start gap-8 lg:gap-12 items-center px-gutter min-h-full h-32 min-w-full">
            <CarouselItem className="basis-auto w-max h-max">
              <h1
                ref={titleRef}
                className="block w-max whitespace-nowrap shrink-0 font-prata leading-none text-[clamp(2.5rem,10vw,6rem)] will-change-transform"
              >
                {mainItem.name}
              </h1>
            </CarouselItem>

            {otherItems.map((item, index) => (
              <CarouselItem key={item.slug} className="basis-auto w-max h-max">
                <Link
                  ref={(node) => {
                    otherItemRefs.current[index] = node;
                  }}
                  href={item.href}
                  className="invisible opacity-0 block w-max whitespace-nowrap"
                >
                  <h3 className="font-prata hover:text-white transition-colors text-xl lg:text-3xl">
                    {item.name}
                  </h3>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    );
  },
);

ProductsFastNav.displayName = "ProductsFastNav";
