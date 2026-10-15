import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
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

/** Timeline progress past which the other items count as shown (and become clickable). */
const CONDENSED_THRESHOLD = 0.35;

/** Links beyond this index share the last stagger step so a long list still finishes fading in. */
const MAX_STAGGER_STEPS = 6;

/** Scroll distance (px) over which the title condenses once the bar is pinned. */
const CONDENSE_DISTANCE = 200;

/** Height (px) the bar settles at once condensed; the resting bar is 7rem on phones and 8rem from lg. */
const CONDENSED_HEIGHT = 80;

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

    const isMainInItems = useMemo(
      () => items.some((item) => item.slug === mainItem.slug),
      [items, mainItem.slug],
    );

    const otherItems = useMemo(() => {
      if (mainItem.slug === "all") return items;
      if (!isMainInItems) return [];
      return items.filter((item) => item.slug !== mainItem.slug);
    }, [isMainInItems, items, mainItem.slug]);

    useEffect(() => {
      carouselApi?.scrollTo(0, false);
    }, [carouselApi, mainItem.slug]);

    // Filters change which links exist (and their hrefs) while the user is scrolled, so the links
    // are driven by CSS variables that the timeline tweens on the root. New links pick up the
    // current progress by themselves and the animation is never rebuilt for them.
    useGSAP(
      () => {
        const root = rootRef.current;
        const title = titleRef.current;
        // The bar stays pinned while the products wrapper it is positioned in scrolls past.
        const boundary = root?.parentElement;
        const restingBg = restingBgRef.current;
        const condensedBg = condensedBgRef.current;
        if (!root || !title || !boundary || !restingBg || !condensedBg) return;

        const pinStart = () => `top top+=${getHeaderOffset()}`;
        const setCondensed = (condensed: boolean) => {
          if (root.dataset.condensed !== String(condensed)) root.dataset.condensed = String(condensed);
        };
        const mm = gsap.matchMedia();

        mm.add(MEDIA, (context) => {
          const { isDesktop, reduceMotion } = context.conditions ?? {};
          const endScale = isDesktop ? 0.5 : 0.6;
          // Scale keeps the title's layout box, so the links slide left to close the freed space.
          const endShift = () => `${-title.offsetWidth * (1 - endScale)}px`;

          ScrollTrigger.create({
            trigger: root,
            start: pinStart,
            endTrigger: boundary,
            end: () => `bottom top+=${getHeaderOffset() + CONDENSED_HEIGHT}`,
            pin: true,
            pinSpacing: false,
            invalidateOnRefresh: true,
          });

          gsap.set(title, { transformOrigin: "left center" });

          if (reduceMotion) {
            gsap.set(title, { scale: endScale });
            gsap.set(root, { height: CONDENSED_HEIGHT });
            gsap.set(root, { "--nav-p": 1, "--nav-shift": endShift });
            gsap.set([restingBg, condensedBg], { autoAlpha: (index: number) => index });
            setCondensed(true);
            return () => setCondensed(false);
          }

          gsap
            .timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: root,
                start: pinStart,
                end: `+=${CONDENSE_DISTANCE}`,
                scrub: 0.5,
                invalidateOnRefresh: true,
                onUpdate: (self) => setCondensed(self.progress > CONDENSED_THRESHOLD),
              },
            })
            .fromTo(
              root,
              { "--nav-p": 0, "--nav-shift": "0px" },
              { "--nav-p": 1, "--nav-shift": endShift, duration: 1 },
              0,
            )
            .to(title, { scale: endScale, duration: 1 }, 0)
            // The bar is absolute and pinned without spacing, so shrinking it never reflows the grid.
            .to(root, { height: CONDENSED_HEIGHT, duration: 1 }, 0)
            .to(restingBg, { autoAlpha: 0, duration: 0.5 }, 0)
            .to(condensedBg, { autoAlpha: 1, duration: 0.5 }, 0);

          return () => setCondensed(false);
        });

        // Web fonts change the title width that the gap correction depends on.
        document.fonts?.ready.then(() => ScrollTrigger.refresh());
      },
      {
        scope: rootRef,
        dependencies: [categorySlug, subcategorySlug],
        revertOnUpdate: true,
      },
    );

    return (
      <div
        ref={rootRef}
        className="fast-nav-wrapper isolate h-28 lg:h-32 absolute w-full z-20 top-20 flex items-center justify-center"
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
          className="min-w-full h-full flex items-center justify-start"
        >
          <CarouselContent className="flex justify-start gap-8 lg:gap-12 items-center px-gutter min-w-full">
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
                  href={item.href}
                  style={{ "--i": Math.min(index, MAX_STAGGER_STEPS) } as CSSProperties}
                  className="fast-nav-link block w-max whitespace-nowrap"
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
