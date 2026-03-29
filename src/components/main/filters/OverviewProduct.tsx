import React from 'react'
import { CardFiltersPanel } from './CardFiltersPanel'
import { type RpcMostRelatedVariant } from '@/utils/filters/rpcCategoryFilters'

interface OverviewProductProps {
  variant?: RpcMostRelatedVariant;
  isLoading?: boolean;
  isEmpty?: boolean;
  onReset?: () => void;
}

// Mock data for demonstration
const mockProduct = {
  image: '/images/products/sample-polo.jpg',
  name: 'Polo Under Armour Vintage Rayas',
  price: 29.90,
  size: 'M'
};

export const OverviewProduct = ({ 
  variant,
  isLoading = false,
  isEmpty = false,
  onReset,
}: OverviewProductProps = {}) => {
  const image = variant?.main_img_url || '/images/products/polo-prueba.jpg';
  const name = variant?.product_name || mockProduct.name;
  const price = typeof variant?.price === 'number' ? variant.price : mockProduct.price;
  const size = variant?.size || mockProduct.size;

  if (isEmpty) {
    return (
      <CardFiltersPanel className="flex flex-col items-center justify-center">
        <div className="w-full space-y-4 text-center">
          <h2 className="font-prata text-xl leading-tight">No products match your filters</h2>
          <p className="text-sm text-black/60">
            Try removing one filter or reset your secondary filters.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="border border-black/30 px-4 py-2 text-sm cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      </CardFiltersPanel>
    );
  }

  return (
    <CardFiltersPanel className="flex flex-col items-center justify-center">
      <div className="w-full space-y-6">
        {isLoading && (
          <div className="w-full text-sm text-black/60 border border-black/10 px-4 py-3">
            Buscando producto relacionado...
          </div>
        )}

        {/* Product Image */}
        <div className="relative aspect-3/4 w-full bg-neutral-100 rounded-sm overflow-hidden">
          <img
          src={image}
          alt={name}
          className='w-full h-full'
          />
          {/* <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full bg-linear-to-br from-neutral-200 to-neutral-100" />
          </div> */}
          <div className='absolute bottom-4 font-serif text-base backdrop-blur-sm bg-black/10  rounded-xl text-white  left-1/2 -translate-x-1/2 w-max px-4 py-2 '>
            {/* <div className='absolute z-0 w-full top-0 left-0 h-full bg-black/55 blur-2xl '/> */}
            <p className='z-10'>Producto relacionado</p>
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-3 text-center">
          <h2 className="font-prata text-xl leading-tight">
            {name}
          </h2>
          
          <p className="text-2xl font-light">
            S/{price.toFixed(2)}
          </p>

          <div className='flex items-center justify-between w-full gap-4'>
            <p className="text-sm text-black/75">
              Status: Nuevo
            </p>
            
            {size && (
            <p className="text-sm text-black/75">
              Talla: {size}
            </p>
          )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t border-black/10 space-y-2 text-sm text-black/60">
          <div className="flex justify-between">
            <span>Disponibilidad</span>
            <span className="text-black">En stock</span>
          </div>
          <div className="flex justify-between">
            <span>Envío</span>
            <span className="text-black">Gratis</span>
          </div>
        </div>

        <button className='border-[0.5] cursor-pointer bg-black text-white w-full py-2'>
          Comprar ahora
        </button>

        {!isLoading && !variant && (
          <p className="text-xs text-black/60">
            No hay coincidencias para los filtros actuales.
          </p>
        )}
      </div>
    </CardFiltersPanel>
  )
}
