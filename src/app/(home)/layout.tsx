import { HeaderBar } from "@/components/main/HeaderLayout/HeaderBar";
import { createClient } from "@/utils/supabase/server";
import { FooterLoader } from "@/components/main/Footer/FooterLoader";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  // Guests hold an anonymous session for their cart; the header still treats them as signed out.
  const userSub = data?.claims.is_anonymous ? null : data?.claims.sub || null;

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
