import type { Metadata } from "next";
import { HeaderBar } from "@/components/main/HeaderLayout/HeaderBar";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Product Detail Layout",
  description: "Layout for the product detail page with header ",
};

export default async function ProductDetailLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  const userSub = data?.claims.sub || null;  

  return (
    <main className="relative  min-h-screen w-full">
        <HeaderBar userId={userSub} variant="product-detail" />
        {children}  
    </main>
  );
}
