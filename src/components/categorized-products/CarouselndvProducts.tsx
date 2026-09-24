'use client'

import * as React from "react"
import Image from "next/image"
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import { canOptimize, isCutoutUrl } from "@/lib/images/media"

export interface CarouselImage {
  src: string
  alt: string
}

interface CarouselIndividualProductsProps {
  images: CarouselImage[]
  /** Admin preview renders inside a panel, not the full viewport. */
  heightClass?: string
}

export function CarouselIndividualProducts({ images, heightClass = "h-screen" }: CarouselIndividualProductsProps) {

  const [api, setApi] = React.useState<CarouselApi>();
  const carouselRef = React.useRef<HTMLDivElement>(null);

  const throttle = (func: (...args: any[]) => void, interval: number) => {
    let lastCall = 0;
    return function (...args: any[]) {
      const now = Date.now();
      if (lastCall + interval < now) {
        lastCall = now;
        func(...args);
      }
    };
  };

  React.useEffect(() => {
    if (!api || !carouselRef.current) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY > 0) {
        api.scrollNext();
      } else {
        api.scrollPrev();
      }
    };

    const throttledWheelHandler = throttle(handleWheel, 500);

    const carouselElement = carouselRef.current;
    carouselElement.addEventListener("wheel", throttledWheelHandler);

    return () => {
      carouselElement.removeEventListener("wheel", throttledWheelHandler);
    };
  }, [api]);

  const slides = images.length ? images : [{ src: "/images/products/polo-1.png", alt: "Producto" }];

  return (
    <Carousel
    opts={{
    loop: slides.length > 1,
    align: "start",
  }}
  setApi={setApi}
   plugins={[
        Autoplay({
          delay: 16000,
        }),
      ]}
    orientation="vertical"
      ref={carouselRef}
    className={`w-full ${heightClass}`}>
      <CarouselContent className={`w-full ${heightClass} mt-0`}>
        {slides.map((image, index) => (
          <CarouselItem key={image.src} className={`w-full ${heightClass} rounded-sm`}>
            <div className="relative p-1 rounded-lg w-full h-full">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority={index === 0}
                sizes="(max-width: 1024px) 100vw, 50vw"
                unoptimized={!canOptimize(image.src)}
                className={isCutoutUrl(image.src) ? "object-contain p-8" : "object-cover"}
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  )
}
