import type { Metadata } from "next";
import { HeaderBar } from "@/components/main/HeaderLayout/HeaderBar";
import { MusicPlayer } from "@/components/reusable/CTA/MusicPlayer/MusicPlayer";


export const metadata: Metadata = {
  title: "App Layout",
  description: "Layout for the application with header and music player",
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main>
        <HeaderBar />
        {children}  
        <MusicPlayer/>
    </main>
  );
}
