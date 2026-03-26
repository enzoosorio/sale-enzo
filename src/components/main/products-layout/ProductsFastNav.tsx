import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Link from "next/link";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface Subcategory {
    name: string;
    href: string;
}

interface ProductsFastNavProps {
    subcategories: Subcategory[];
}

export const ProductsFastNav = ({ subcategories }: ProductsFastNavProps) => {

    return (        
        <div className="fast-nav-wrapper min-h-32 absolute w-screen z-20 top-20 pl-8 flex items-center opacity-0 invisible justify-start gap-12">
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