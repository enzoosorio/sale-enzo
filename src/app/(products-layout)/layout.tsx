import { SuperBarLayout } from "@/components/categorized-products/SuperBarLayout"


export default function ProductLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
    {/* header super bar layout */}
    <SuperBarLayout/>
    <main>
        {children}
    </main>
    </>
  )
}