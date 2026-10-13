import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetailView } from '@/components/products/ProductDetailView'
import { getProductDetail } from '@/lib/products/getProductDetail'
import { getProductSeoContext } from '@/lib/seo/catalog'
import { productCanonicalPath, productsListingPath } from '@/lib/seo/canonical'
import { buildBreadcrumbJsonLd, buildProductJsonLd, serializeJsonLd, type Crumb } from '@/lib/seo/jsonLd'
import { BASE_OPEN_GRAPH, DEFAULT_OG_IMAGE, siteUrl } from '@/lib/seo/site'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ variant?: string }>
}

function summarize(text: string | null, max = 160): string | undefined {
  const clean = text?.replace(/\s+/g, ' ').trim()
  if (!clean) return undefined
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ id }, { variant }] = await Promise.all([params, searchParams])
  const product = await getProductDetail(id, variant)
  if (!product) return { title: 'Producto no encontrado', robots: { index: false } }

  const description =
    summarize(product.description) ??
    `${product.name}${product.brand ? ` de ${product.brand}` : ''}, prenda de segunda mano a S/ ${product.price.toFixed(2)}.`
  const canonical = productCanonicalPath(id)
  const images = product.images.length
    ? product.images.slice(0, 1).map((i) => ({ url: i.src, alt: i.alt }))
    : [{ url: DEFAULT_OG_IMAGE, alt: product.name }]

  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: { ...BASE_OPEN_GRAPH, title: product.name, description, url: canonical, images },
    twitter: { card: 'summary_large_image', title: product.name, description, images: images.map((i) => i.url) },
  }
}

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, { variant }] = await Promise.all([params, searchParams])
  const [product, seo] = await Promise.all([getProductDetail(id, variant), getProductSeoContext(id)])
  if (!product) notFound()

  const base = siteUrl()
  const canonical = productCanonicalPath(id)
  const crumbs: Crumb[] = [{ name: 'Inicio', path: '/home' }]
  if (seo?.category) crumbs.push({ name: seo.category.name, path: productsListingPath(seo.category.slug) })
  if (seo?.category && seo.subcategory) {
    crumbs.push({ name: seo.subcategory.name, path: productsListingPath(seo.category.slug, seo.subcategory.slug) })
  }
  crumbs.push({ name: product.name, path: canonical })

  const jsonLd = [
    buildProductJsonLd(
      {
        id,
        name: product.name,
        description: product.description,
        brand: product.brand,
        sku: product.sku,
        price: product.price,
        images: product.images.map((i) => i.src),
        items: seo?.items.length ? seo.items : [{ status: product.status, stock: product.stock }],
        url: canonical,
      },
      base,
    ),
    buildBreadcrumbJsonLd(crumbs, base),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <ProductDetailView product={product} />
    </>
  )
}
