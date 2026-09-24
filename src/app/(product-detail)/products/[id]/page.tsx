import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetailView } from '@/components/products/ProductDetailView'
import { getProductDetail } from '@/lib/products/getProductDetail'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ variant?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ id }, { variant }] = await Promise.all([params, searchParams])
  const product = await getProductDetail(id, variant)
  if (!product) return { title: 'Producto no encontrado' }
  return {
    title: `${product.name} | Sale Enzo`,
    description: product.description ?? undefined,
    openGraph: { images: product.images.slice(0, 1).map((i) => i.src) },
  }
}

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, { variant }] = await Promise.all([params, searchParams])
  const product = await getProductDetail(id, variant)
  if (!product) notFound()

  return <ProductDetailView product={product} />
}
