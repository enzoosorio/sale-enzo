import type { Metadata } from "next";

import { HeaderBar } from "@/components/main/HeaderLayout/HeaderBar";


export const metadata: Metadata = {
  title: "App Layout",
  description: "Layout for the application with header and music player",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main>
        <HeaderBar />
        {children}  
        {/* <MusicPlayer/> */}
    </main>
  );
}
