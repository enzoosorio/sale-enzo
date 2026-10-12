import type { Metadata } from "next";

import { HeaderBar } from "@/components/main/HeaderLayout/HeaderBar";
import { SillyMascot } from "@/components/auth/SillyMascot";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { NO_INDEX } from "@/lib/seo/site";

export const metadata: Metadata = {
  robots: NO_INDEX,
};

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // A guest's anonymous cart session must still be able to reach login and register.
  if (user && !user.is_anonymous) {
    redirect("/home");
  }

  return (
    <div className="h-[90vh] md:h-auto">
      <HeaderBar />
      <main className="relative overflow-hidden flex flex-col h-[calc(100vh-var(--navbar-height))]">
        {/* sillye svg head - fixed background - Desktop positioned right, Mobile positioned bottom center */}
        <SillyMascot
          className={`absolute md:top-40 top-1/2 left-1/2 -translate-x-1/2 scale-[0.32]
            sm:left-2/12 sm:translate-x-0 opacity-85 sm:opacity-90 sm:top-1/3 sm:scale-[0.6]
            md:left-1/4 md:scale-90 md:opacity-100
            lg:left-5/12 lg:scale-100 lg:top-28
            xl:left-[45%] pointer-events-none z-0`}
        />
        {/* Scrollable content area */}
        {/* Altura estatica deberia acoplarse a lo restante del screen (viewport)
      podria calcularlo dinamicamente (js)
      */}
        <div className="relative max-h-[90vh] z-10 overflow-auto pt-1 pb-16 scrollbar-hide">
          {children}
        </div>
      </main>
    </div>
  );
}
