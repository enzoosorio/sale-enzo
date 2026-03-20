'use client'

import * as React from "react"
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
export function CarouselIndividualProducts() {

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

  return (
    <Carousel 
    opts={{
    loop: true,
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
    className="w-full h-screen ">
      <CarouselContent className=" w-full h-screen mt-0  ">
        {Array.from({ length: 5 }).map((_, index) => (
          <CarouselItem key={index} className="w-full h-screen rounded-sm">
            <div className="p-1 rounded-lg w-full h-full flex items-center justify-center">
              <p>{index + 1}</p>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  )
}