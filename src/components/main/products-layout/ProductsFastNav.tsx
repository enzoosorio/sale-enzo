import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Link from "next/link";

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

export const ProductsFastNav = ({ items, mainItem }: ProductsFastNavProps) => {

    const otherItems = items.filter((item) => item.slug !== mainItem.slug);

    return (        
        <div className="fast-nav-wrapper min-h-32 absolute w-screen bg-amber-500 z-20 top-20 pl-8 flex items-center justify-start gap-12">
               <h1
                    className="subcategory-title hover:text-black/75 w-max bg-amber-300 transition-colors title-main font-prata text-8xl"
                >
                    {mainItem.name}
                </h1>
            {
                otherItems.length > 0 && (
                    otherItems.map((item) => (
                        <Link href={item.href} key={item.slug} className="other-subcategories-fast-nav opacity-0 pointer-events-none">
                            <h3 className="font-prata hover:text-white transition-colors text-3xl">
                                {item.name}
                            </h3>
                        </Link>
                    ))
                )
            }
        </div>
    )

}