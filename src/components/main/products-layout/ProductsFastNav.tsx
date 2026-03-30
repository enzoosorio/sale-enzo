import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { memo, useMemo } from "react";
import Link from "next/link";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export interface ProductsFastNavItem {
  name: string;
  slug: string;
  href: string;
}

interface ProductsFastNavProps {
  items: ProductsFastNavItem[];
  mainItem: ProductsFastNavItem;
}

export const ProductsFastNav = memo(({ items, mainItem }: ProductsFastNavProps) => {
    const isMainInItems = useMemo(
        () => items.some((item) => item.slug === mainItem.slug),
        [items, mainItem.slug],
    );

    const otherItems = useMemo(
        () => {
            if (mainItem.slug === "all") {
                return items;
            }

            if (!isMainInItems) {
                return [];
            }

            return items.filter((item) => item.slug !== mainItem.slug);
        },
        [isMainInItems, items, mainItem.slug],
    );

    return (
        <div className="fast-nav-wrapper min-h-32 absolute w-screen z-20 top-20 flex items-center justify-center">
            <Carousel
                opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}
                className="w-full h-full flex items-center justify-center"
            >
                <CarouselContent className="flex justify-start gap-12 items-start px-2 h-full w-full">
                    <CarouselItem className="basis-auto w-max">
                        <Link href={mainItem.href} className="block w-max whitespace-nowrap shrink-0">
                            <h1 className="subcategory-title hover:text-black/75 w-max whitespace-nowrap shrink-0 transition-colors title-main font-prata text-8xl">
                                {mainItem.name}
                            </h1>
                        </Link>
                    </CarouselItem>

                    {otherItems.map((item) => (
                        <CarouselItem key={item.slug} className="basis-auto w-max">
                            <Link
                                href={item.href}
                                className="other-subcategories-fast-nav opacity-0 pointer-events-none block w-max whitespace-nowrap"
                            >
                                <h3 className="font-prata hover:text-white transition-colors text-3xl">
                                    {item.name}
                                </h3>
                            </Link>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </div>
    );
});

ProductsFastNav.displayName = "ProductsFastNav";