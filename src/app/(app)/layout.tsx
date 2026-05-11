import type { Metadata } from "next";
import { HeaderBar } from "@/components/main/HeaderLayout/HeaderBar";
import { createClient } from "@/utils/supabase/server";
import { FooterLoader } from "@/components/main/Footer/FooterLoader";

export const metadata: Metadata = {
  title: "App Layout",
  description: "Layout for the application with header and music player",
};

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  const userSub = data?.claims.sub || null;  

  return (
    <main className="relative flex min-h-screen w-full flex-col bg-off-white">
        <HeaderBar userId={userSub} />
        <div className="flex-1">
          {children}
        </div>
        {/* <MusicPlayer/> */}
        <FooterLoader />
    </main>
  );
}
