import Link from 'next/link'
import { CarouselIndividualProducts, type CarouselImage } from '@/components/categorized-products/CarouselndvProducts'
import { PrimaryButton } from '@/components/reusable/CTA/buttons/Button'
import { formatPrice } from '@/lib/images/media'

export interface ProductDetailData {
  name: string
  brand: string | null
  description: string | null
  size: string | null
  fitsLike: string | null
  gender: string | null
  fit: string | null
  price: number
  compareAtPrice: number | null
  conditionScore: number | null
  conditionNote: string | null
  status: string
  stock: number
  sku: string | null
  metadata: Record<string, string>
  images: CarouselImage[]
  /** Other sizes/colors of the same product */
  siblings?: { id: string; label: string; href: string; active: boolean }[]
}

const STATUS_LABEL: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  sold: 'Vendido',
}

const GENDER_LABEL: Record<string, string> = { male: 'Hombre', female: 'Mujer', unisex: 'Unisex' }

const META_LABEL: Record<string, string> = {
  team: 'Equipo',
  university: 'Universidad',
  league: 'Liga',
  player: 'Jugador',
  number: 'Número',
  technology: 'Tecnología',
  edition: 'Edición',
  collection: 'Colección',
  sport: 'Deporte',
  use: 'Uso',
  material: 'Material',
}

/**
 * Presentational product detail. Used by the public page and by the admin
 * staging preview, so a draft looks exactly like it will once published.
 */
export function ProductDetailView({ product, preview = false }: { product: ProductDetailData; preview?: boolean }) {
  const specs = Object.entries(product.metadata).filter(([key]) => META_LABEL[key])

  return (
    <section className={`individual-product translate-y-0 flex lg:flex-row flex-col items-center justify-center w-full ${preview ? 'min-h-[80vh]' : 'lg:h-screen'} bg-off-white`}>
      <div className={`carousel-indv-product flex w-full ${preview ? 'h-[80vh]' : 'h-[70vh] lg:h-full'} items-center justify-center`}>
        <CarouselIndividualProducts images={product.images} heightClass={preview ? 'h-[80vh]' : 'h-[70vh] lg:h-screen'} />
      </div>
      <aside className='details-indv-product flex flex-col items-start justify-center gap-16 p-8 w-full h-full'>
        <div className='flex flex-col items-start justify-center w-full gap-16'>
          <div className='flex flex-col items-start justify-center gap-8 w-full'>
            <div className='text-base font-vidaloka flex flex-col items-start justify-start gap-4'>
              {product.brand && <h3 className='text-base'>{product.brand}</h3>}
              <h1 className='text-base'>{product.name}</h1>
              <p className='text-base'>
                {formatPrice(product.price)}
                {product.compareAtPrice ? (
                  <span className='ml-3 text-black/40 line-through'>{formatPrice(product.compareAtPrice)}</span>
                ) : null}
              </p>
            </div>
            <div className='flex flex-col items-start justify-center gap-6'>
              <div className='flex flex-wrap items-center gap-3 font-vidaloka text-base'>
                {product.siblings?.length ? (
                  product.siblings.map((s) => (
                    <Link
                      key={s.id}
                      href={s.href}
                      className={`px-3 py-1 border ${s.active ? 'border-black' : 'border-black/20 text-black/60'}`}
                    >
                      {s.label}
                    </Link>
                  ))
                ) : (
                  <p>{product.size}</p>
                )}
              </div>
              <p className='font-nanum text-sm text-black/70'>
                {[
                  product.fitsLike && `Le queda como ${product.fitsLike}`,
                  product.fit && `Corte ${product.fit}`,
                  product.gender && GENDER_LABEL[product.gender],
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {product.description && (
                <p className='text-black/80 font-nanum text-base max-w-[80ch]'>{product.description}</p>
              )}
            </div>
          </div>
          <div className='flex lg:flex-row flex-col items-start lg:justify-between justify-center gap-8 w-full'>
            <div className='flex flex-col items-start justify-center gap-6 font-vidaloka text-base'>
              {product.conditionScore !== null && <p>Estado: {product.conditionScore}/10</p>}
              <p>{STATUS_LABEL[product.status] ?? product.status}</p>
              <p>{product.stock} Disponible{product.stock === 1 ? '' : 's'}</p>
              {product.sku && <p>SKU: {product.sku}</p>}
            </div>
            <div className='flex flex-col items-start justify-center gap-4'>
              <h4 className='font-vidaloka'>Especificaciones</h4>
              {product.conditionNote && <p className='font-nanum max-w-[40ch]'>{product.conditionNote}</p>}
              {specs.length > 0 && (
                <dl className='font-nanum text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1'>
                  {specs.map(([key, value]) => (
                    <div key={key} className='contents'>
                      <dt className='text-black/50'>{META_LABEL[key]}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </div>
        <div className='flex flex-row w-full items-end justify-end gap-8'>
          <PrimaryButton>Añadir al carrito</PrimaryButton>
          <PrimaryButton>Comprar ahora</PrimaryButton>
        </div>
      </aside>
    </section>
  )
}
