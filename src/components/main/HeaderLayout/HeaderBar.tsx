
import Image from "next/image"
import { PrimaryButton } from "../../reusable/CTA/buttons/Button"
import { Bag } from "@/components/reusable/svgs/Bag"
import { Favoritos } from "@/components/reusable/svgs/Favoritos"
import { Logo } from "./Logo"
import { CategoriesButton } from "./Categories/CategoriesButtonLayout"
import Link from "next/link"
import { logoutUser } from "@/actions/login"
import { LogoutButton } from "./LogoutButton"

interface HeaderBarProps {
    userId? : string | null;
}

export const HeaderBar = ({ userId }: HeaderBarProps) => {

  return (
    <header className="w-full min-h-[100px] flex items-center justify-center ">
        <nav className="relative p-2 px-16 xl:px-20 w-full h-full flex items-center justify-between">
            <ul className="flex items-center text-lg justify-center gap-6 font-prata">
               <li className="cursor-pointer">
                {/* todo: agregar el contacto */}
                <Link href="#" className="linkk font-prata">
                Contacto
                </Link>
               </li> 
               <li className="cursor-pointer linkk font-prata">
                <CategoriesButton/>
               </li> 
            </ul>
            {/* "intento de logo" */}
            <Link className="w-max h-max" href={'/home'}>
                <Logo/>
            </Link>
            <ul className="flex items-center justify-center gap-8">
                <div className="flex items-center justify-center gap-4">
                  <Bag/>
                  <Favoritos/>
                </div>
                {
                    userId ? (
                    <LogoutButton/>
                    ) : (
                        <Link className="w-max h-max" href={'/login'}>
                    <PrimaryButton>
                        Iniciar sesión
                    </PrimaryButton>
                </Link>
                    )
                }
                {/* parte del bot */}
                {userId && (
                    <div className=" h-8 flex items-center justify-center">
                <Image
                    src="/images/sillye-head.png"
                    alt="Bot Icon"
                    width={72}
                    height={48}
                    className="w-full h-full"
                />
                </div>
                )}
            </ul>

        </nav>
    </header>
  )
}
