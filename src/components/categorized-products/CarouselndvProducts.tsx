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
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

export interface CarouselImage {
  src: string
  alt: string
}

interface CarouselIndividualProductsProps {
  images: CarouselImage[]
  /** Admin preview renders inside a panel, not the full viewport. */
  heightClass?: string
}

const DESKTOP_QUERY = "(min-width: 64rem)"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function throttle<Args extends unknown[]>(func: (...args: Args) => void, interval: number) {
  let lastCall = 0
  return (...args: Args) => {
    const now = Date.now()
    if (lastCall + interval < now) {
      lastCall = now
      func(...args)
    }
  }
}

/**
 * Product gallery. lg and up: full-height vertical carousel with autoplay and wheel paging.
 * Below lg: a horizontal swipe gallery with dots, no autoplay and no wheel hijack, so the
 * page keeps scrolling vertically under the finger.
 */
export function CarouselIndividualProducts({ images, heightClass = "h-screen" }: CarouselIndividualProductsProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)

  const [api, setApi] = React.useState<CarouselApi>()
  const [selected, setSelected] = React.useState(0)
  const carouselRef = React.useRef<HTMLDivElement>(null)

  const slides = images.length ? images : [{ src: "/images/products/polo-1.png", alt: "Producto" }]
  const multiple = slides.length > 1

  React.useEffect(() => {
    if (!api) return
    const onSelect = () => setSelected(api.selectedScrollSnap())
    onSelect()
    api.on("select", onSelect).on("reInit", onSelect)
    return () => {
      api.off("select", onSelect).off("reInit", onSelect)
    }
  }, [api])

  // Wheel paging only where the gallery fills the screen (desktop).
  React.useEffect(() => {
    if (!api || !carouselRef.current || !isDesktop) return

    const handleWheel = throttle((event: WheelEvent) => {
      if (event.deltaY > 0) api.scrollNext()
      else api.scrollPrev()
    }, 500)

    const element = carouselRef.current
    element.addEventListener("wheel", handleWheel)
    return () => element.removeEventListener("wheel", handleWheel)
  }, [api, isDesktop])

  const plugins = React.useMemo(
    () => (isDesktop && multiple && !reducedMotion ? [Autoplay({ delay: 16000 })] : []),
    [isDesktop, multiple, reducedMotion],
  )

  return (
    <div className={cn("relative w-full", heightClass)}>
      <Carousel
        key={isDesktop ? "vertical" : "horizontal"}
        opts={{ loop: multiple, align: "start", ...(reducedMotion ? { duration: 0 } : {}) }}
        setApi={setApi}
        plugins={plugins}
        orientation={isDesktop ? "vertical" : "horizontal"}
        ref={carouselRef}
        aria-label="Fotos del producto"
        className={cn("w-full", heightClass)}
      >
        <CarouselContent className={cn("w-full", heightClass, isDesktop ? "mt-0" : "ml-0")}>
          {slides.map((image, index) => (
            <CarouselItem
              key={image.src}
              aria-label={`Imagen ${index + 1} de ${slides.length}`}
              className={cn("w-full rounded-sm", heightClass, !isDesktop && "pl-0")}
            >
              <div className="relative p-1 rounded-lg w-full h-full">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 1023px) 100vw, 50vw"
                  unoptimized={!canOptimize(image.src)}
                  draggable={false}
                  className={isCutoutUrl(image.src) ? "object-contain p-8" : "object-cover"}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {!isDesktop && multiple && (
        <div role="group" aria-label="Elegir imagen" className="absolute inset-x-0 bottom-2 flex items-center justify-center">
          {slides.map((image, index) => (
            <button
              key={image.src}
              type="button"
              aria-label={`Imagen ${index + 1} de ${slides.length}`}
              aria-current={index === selected ? "true" : undefined}
              onClick={() => api?.scrollTo(index, reducedMotion)}
              className="group flex size-11 items-center justify-center focus-visible:outline-none"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block size-2.5 rounded-full border border-[#221C1C]/60 transition-colors group-focus-visible:ring-2 group-focus-visible:ring-[#221C1C] group-focus-visible:ring-offset-2",
                  index === selected ? "bg-[#221C1C]" : "bg-white/80",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
