import Image from "next/image"
import { PrimaryButton } from "../../reusable/CTA/Button"
import { Bag } from "@/components/reusable/svgs/Bag"
import { Favoritos } from "@/components/reusable/svgs/Favoritos"
import Link from "next/link"
import { Logo } from "./Logo"
import { CategoriesButton } from "./Categories/CategoriesButtonLayout"

export const HeaderBar = () => {

  return (
    <header className="w-full min-h-[100px] flex items-center justify-center ">
        <nav className="relative p-2 px-16 xl:px-20 w-full h-full flex items-center justify-between">
            <ul className="flex items-center text-lg justify-center gap-6 font-prata">
               <li className="cursor-pointer">
                {/* todo: agregar el contacto */}
                <a href="#" className="linkk font-prata">
                Contacto
                </a>
               </li> 
               <li className="cursor-pointer linkk font-prata">
                <CategoriesButton/>
               </li> 
            </ul>
            {/* "intento de logo" */}
            <Logo/>
            <ul className="flex items-center justify-center gap-8">
                <div className="flex items-center justify-center gap-4">
                  <Bag/>
                  <Favoritos/>
                </div>
                <PrimaryButton>
                    Iniciar sesión
                </PrimaryButton>
                {/* parte del bot */}
                <div className=" h-8 flex items-center justify-center">
                <Image
                    src="/images/sillye-head.png"
                    alt="Bot Icon"
                    width={72}
                    height={48}
                    className="w-full h-full"
                />
                </div>
            </ul>

        </nav>
    </header>
  )
}
