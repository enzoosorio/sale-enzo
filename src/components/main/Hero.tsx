import { SuperBarraBusqueda } from "@/components/reusable/CTA/SuperBarraBusqueda"
import { OverviewProductsHero } from "./OverviewProductsHero"


export const Hero = () => {
  return (
    <>
    <SuperBarraBusqueda />
    <OverviewProductsHero products={[]} />
    </>
  )
}
