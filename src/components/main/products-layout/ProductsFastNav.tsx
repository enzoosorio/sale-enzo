import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { finalBackground, initialBackground } from "@/app/(app)/home/page";

gsap.registerPlugin(useGSAP, Flip, ScrollTrigger);

interface Subcategory {
    name: string;
    href: string;
}

interface ProductsFastNavProps {
    subcategories: Subcategory[];
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export const ProductsFastNav = ({ subcategories, containerRef }: ProductsFastNavProps) => {

    useGSAP(() => {

        let animatingFastBar = false;

       let isDetached = false;

        const tlScrubTitle = gsap.timeline({
            paused: true
        });

        tlScrubTitle.to('.title-main', {
            fontSize: "2.25rem",
            ease: "none"
        });

        const tlFreeTitle = gsap.timeline({
            paused: true
        });

        tlFreeTitle.to('.title-main', {
            fontSize: "2.25rem",
            duration: 0.4,
            ease: "circ.out"
        });

        const tlFastBar = gsap.timeline({
            paused: true,
        })

        tlFastBar.to('.other-subcategories-fast-nav', {
            opacity: 1,
            pointerEvents: 'auto',
            duration: 1,
            stagger: {
                each: 0.25,
                from: "start"
            },
            ease: "circ.out"
        }, 0)

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: ".wrapper-pf",
                start: "top top",
                end: "bottom top",
                pin: '.fast-nav-wrapper',
                scrub: true,
                markers: true,
                onUpdate: (self) => {
                    
                    const progress = self.progress;    

                    if (progress <= 0.085 ) {
                        if (isDetached) {
                            isDetached = false;

                            
                            const current = gsap.getProperty('.title-main', 'fontSize');

                            tlScrubTitle.progress(progress / 0.105);
                        }

                        tlScrubTitle.progress(progress / 0.105);
                    }
                    else {
                        if (!isDetached) {
                            isDetached = true;
                            tlScrubTitle.pause();
                            tlFreeTitle.progress(0).play();
                        }
                    }

                    if (progress > 0.105 && !animatingFastBar) {
                        animatingFastBar = true;
                        tlFastBar.duration(1.3);
                        tlFastBar.play();

                    }
                    else if (progress <= 0.105 && animatingFastBar) {
                        animatingFastBar = false;
                        tlFastBar.duration(0.5);
                        tlFastBar.reverse();
                    }

                }
            },
        });
        tl.fromTo('.fast-nav-wrapper',
                { top: 0 }, // equivalente a top-20 (80px)
                {
                    top: 0,
                    ease: "power2.out",
                },
                0
                )
        tl.fromTo(".fast-nav-wrapper",
            {
                background: initialBackground,
            },
            {
                background: finalBackground,
                //adding backdrop filter:
                backdropFilter: "blur(10px)",

                ease: "elastic.out(1,1)",
                duration: 0.025,
            },
            0
        )

    }, [])

    return (        
        <div className="fast-nav-wrapper min-h-32 absolute w-screen z-20 top-20 pl-8 flex items-center justify-start gap-12">
               <h1
                    className="subcategory-title hover:text-black/75 transition-colors title-main font-prata text-8xl"
                >
                    {subcategories[0].name}
                </h1>
            {
                subcategories.length > 1 && (
                    subcategories.slice(1).map((subcategory, index) => (
                        <Link href={subcategory.href} key={index} className="other-subcategories-fast-nav opacity-0 pointer-events-none">
                            <h3 className="font-prata hover:text-white transition-colors text-3xl">
                                {subcategory.name}
                            </h3>
                        </Link>
                    ))
                )
            }
        </div>
    )

}