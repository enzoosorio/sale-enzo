import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { memo, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

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
    const [carouselApi, setCarouselApi] = useState<CarouselApi>();

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

    // Reset carousel position when items or mainItem change
    useEffect(() => {
        if (!carouselApi) return;
        carouselApi.scrollTo(0, false);
    }, [carouselApi, items, mainItem.slug]);

    return (
        <div className="fast-nav-wrapper h-32 absolute w-screen z-20 top-20 flex items-center justify-center bg-off-white">
            <Carousel
                opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}
                setApi={setCarouselApi}
                className="min-w-full h-32 flex items-center justify-start"
            >
                <CarouselContent className="flex justify-start gap-12 items-center px-9 min-h-full h-32 min-w-full">
                    <CarouselItem className="basis-auto w-max h-max">
                            <h1 className="block subcategory-title hover:text-black/75 w-max whitespace-nowrap shrink-0 transition-colors title-main font-prata text-8xl">
                                {mainItem.name}
                            </h1>
                    </CarouselItem>

                    {otherItems.map((item) => (
                        <CarouselItem key={item.slug} className="basis-auto w-max h-max">
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