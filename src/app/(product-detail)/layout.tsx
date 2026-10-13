import { HeaderBar } from "@/components/main/HeaderLayout/HeaderBar";
import { createClient } from "@/utils/supabase/server";

export default async function ProductDetailLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  // Guests hold an anonymous session for their cart; the header still treats them as signed out.
  const userSub = data?.claims.is_anonymous ? null : data?.claims.sub || null;

  return (
    <main className="relative  min-h-screen w-full">
        <HeaderBar userId={userSub} variant="product-detail" />
        {children}  
    </main>
  );
}
