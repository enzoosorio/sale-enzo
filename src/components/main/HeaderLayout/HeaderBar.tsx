import Image from "next/image"
import { PrimaryButton } from "../../reusable/CTA/buttons/Button"
import { Bag } from "@/components/reusable/svgs/Bag"
import { Favoritos } from "@/components/reusable/svgs/Favoritos"
import { CategoriesButton } from "./Categories/CategoriesButtonLayout"
import Link from "next/link"
import { LogoutButton } from "./LogoutButton"
import { MainLogo } from "@/components/reusable/MainLogo"
import { MobileMainLogo } from "./Mobile/MobileMainLogo";

interface HeaderBarProps {
    userId? : string | null;
}

export const HeaderBar = ({ userId }: HeaderBarProps) => {
  return (
    <>
    <header className="w-full min-h-(--navbar-height) flex items-center justify-center ">
        <nav className="relative p-2 px-4 md:px-16 xl:px-20 w-full h-full flex items-center justify-between">
            {/* Desktop Navigation - Hidden on mobile */}
            <ul className="hidden md:flex items-center text-lg justify-center gap-6 font-prata">
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
            {/* customed mobile logo */}
            <MobileMainLogo/>
            <Link className="w-max h-max hidden md:block" href={'/home'}>
                <MainLogo className="w-12"/>
            </Link>

            {/* Desktop Actions - Hidden on mobile */}
            <ul className="hidden md:flex items-center justify-center gap-8">
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
                {/* parte del face - bot */}
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

            {/* Mobile Actions - Shown only on mobile */}
            <div className="flex md:hidden items-center justify-center gap-4">
                {
                    userId ? (
                      <div className="h-8 flex items-center justify-center">
                        <Image
                            src="/images/sillye-head.png"
                            alt="Bot Icon"
                            width={72}
                            height={48}
                            className="w-full h-full"
                        />
                      </div>
                    ) : (
                        <Link className="w-max h-max" href={'/login'}>
                          <PrimaryButton className="text-sm px-4 py-2">
                              Iniciar sesión
                          </PrimaryButton>
                        </Link>
                    )
                }
            </div>

        </nav>
    </header>
    </>
  )
}
