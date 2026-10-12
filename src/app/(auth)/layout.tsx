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
    <div>
      <HeaderBar />
      {/* dvh follows the visible viewport on phones (100vh ignores the browser toolbars). The page
          scrolls naturally on mobile, so nothing at the bottom of the card can end up unreachable. */}
      <main className="relative overflow-clip flex flex-col min-h-[calc(100dvh-var(--navbar-height))]">
        {/* sillye svg head - Mobile: in flow, centered under the card (fully visible, small canvas).
            sm and up: absolute background figure positioned beside the card. */}
        <SillyMascot
          className={`relative mx-auto max-sm:order-last max-sm:-mt-6 opacity-85
            sm:absolute sm:mx-0 sm:left-2/12 sm:opacity-90 sm:top-1/3 sm:scale-[0.6]
            md:top-40 md:left-1/4 md:scale-90 md:opacity-100
            lg:left-5/12 lg:scale-100 lg:top-28
            xl:left-[45%] pointer-events-none z-0`}
        />
        <div className="relative z-10 pt-1 pb-[max(4rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </main>
    </div>
  );
}
