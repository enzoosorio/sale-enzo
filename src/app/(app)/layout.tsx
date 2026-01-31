import type { Metadata } from "next";
import { HeaderBar } from "@/components/main/HeaderLayout/HeaderBar";
import { MusicPlayer } from "@/components/reusable/CTA/MusicPlayer/MusicPlayer";
import { createClient } from "@/utils/supabase/server";

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
    <main>
        <HeaderBar userId={userSub} />
        {children}  
        <MusicPlayer/>
    </main>
  );
}
