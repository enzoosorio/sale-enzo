
import { PrimaryButton } from "../../reusable/CTA/buttons/Button";
import { CartBadge } from "@/components/cart/CartBadge";
import { Favoritos } from "@/components/reusable/svgs/Favoritos";
import { CategoriesButton, CategoriesPanelHost } from "./Categories/CategoriesButtonLayout";
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";
import { MobileMainLogo } from "./Mobile/MobileMainLogo";
import { isAdmin } from "@/lib/auth/isAdmin";
import { MainLogoAnimated } from "@/components/reusable/svgs/MainLogo-w-Animations";
import { HeaderCenter } from "./HeaderCenter";


interface HeaderBarProps {
  userId?: string | null;
  variant?: "product-detail" | "default";
}

export const HeaderBar = async ({
  userId,
  variant = "default",
}: HeaderBarProps) => {
  // Server-side check if user is admin
  const userIsAdmin = userId ? await isAdmin() : false;

  return (
    <>
      {/* todo: mejorar la apariencia del radial gradient */}
      <header
        className={` text-black
        min-h-(--navbar-height) flex items-center justify-center
        ${variant === "product-detail" ? "absolute z-10 top-10 inset-x-gutter bg-white/15 shadow-xl backdrop-blur-2xl rounded-sm" : "sticky top-0 z-30 has-[[data-search-elevated]]:z-[101] gradial-radient w-full"}
        
        `}
      >
        {/* The floating detail header already sits on the page gutter, so it only needs inner padding. */}
        <nav className={`relative py-2 bg-transparent ${variant === "product-detail" ? "px-4 md:px-8" : "px-gutter"} w-full h-full flex items-center justify-between`}>
          {/* Desktop Navigation - Hidden on mobile */}
          <ul className="hidden md:flex items-center text-lg justify-center gap-6 font-prata" data-dock-bound="start">
            <li className="cursor-pointer">
              {/* todo: agregar el contacto */}
              <Link href="#" className="linkk font-prata">
                Contacto
              </Link>
            </li>
            <li className="cursor-pointer linkk font-prata">
              <CategoriesButton />
            </li>
            {/* Admin-only Dashboard link */}
            {userIsAdmin && (
              <li className="cursor-pointer linkk font-prata">
                <Link href="/admin">Dashboard</Link>
              </li>
            )}
          </ul>
          {/* customed mobile logo */}
          <div className="md:hidden" data-dock-bound="start">
            <MobileMainLogo />
          </div>
          <HeaderCenter>
            <Link className="block w-max h-max rounded-full" href={"/home"}>
              <MainLogoAnimated className="w-12" />
            </Link>
          </HeaderCenter>

          {/* Desktop Actions - Hidden on mobile */}
          <ul className="hidden md:flex items-center justify-center gap-8" data-dock-bound="end">
            <div className="flex items-center justify-center gap-4">
              <CartBadge />
              <Favoritos id="favoritos0" />
            </div>
            {userId ? (
              <LogoutButton />
            ) : (
              <Link className="w-max h-max" href={"/login"}>
                <PrimaryButton>Iniciar sesión</PrimaryButton>
              </Link>
            )}
            </ul>

          {/* Mobile Actions - Shown only on mobile */}
          <div className="flex md:hidden items-center justify-center gap-4" data-dock-bound="end">
            {userId ? (
              <LogoutButton />
            ) : (
              <Link className="w-max h-max" href={"/login"}>
                <PrimaryButton className="text-sm px-4 py-2">
                  Iniciar sesión
                </PrimaryButton>
              </Link>
            )}
          </div>
        </nav>
      </header>
      <CategoriesPanelHost />
    </>
  );
};
