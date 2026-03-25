import { CarouselIndividualProducts } from '@/components/categorized-products/CarouselndvProducts'
import { PrimaryButton } from '@/components/reusable/CTA/buttons/Button'
import React from 'react'

export default function Page() {
    return (

            <section className='individual-product translate-y-0 flex items-center justify-center w-full h-screen  bg-off-white'>
                    {/* TODO: ARREGLAR LA ALTURA PQ AHORA EL HEADERBAR ES ABSOLUTO PARA ESTA PAGINA */}
                {/* image container */}
                <div className='carousel-indv-product flex w-full h-full items-center justify-center'>
                    {/* <img src="/images/products/polo-1.png" alt="product image" 
                    className='w-full h-full object-cover' /> */}
                <CarouselIndividualProducts/>
                </div>
                <aside className='details-indv-product flex flex-col items-start justify-center gap-20 p-8 w-full h-full'>
                    <div className='flex flex-col items-start justify-center w-full gap-20 '>
                        {/* top container */}                   
                        <div className='flex flex-col items-start justify-center gap-8 w-full'>
                            <div className='text-base font-vidaloka flex flex-col items-start justify-start gap-4'>
                                <h3 className='text-base'>Nike</h3>
                                <h1 className='text-base'>Nike Court Carlos Alcaraz Slam</h1>
                                <p className='text-base'>120 PEN</p>
                            </div> 
                            <div className='flex flex-col items-start justify-center gap-10'>
                                <p className='text-base font-vidaloka'>L</p>
                                <p className='text-black/80 font-nanum text-base max-w-[80ch]'>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quam, numquam mollitia sit quidem explicabo suscipit! Sit deleniti voluptatibus deserunt aut?</p>
                            </div>
                        </div>
                        {/* middle container */}
                        <div className='flex lg:flex-row flex-col items-start lg:justify-between justify-center gap-4 lg:gap-0 w-full'>
                            <div className='flex flex-col items-start justify-center gap-8 font-vidaloka text-base'>
                                <p>Uso: 7/10</p>
                                <p>Reservado</p>
                                <p>1 Disponible</p>
                                <p>SKU: 103892489</p>
                            </div>
                            <div className='flex flex-col items-start justify-center gap-4 '>
                                <h4 className='font-vidaloka'>Especificaciones de uso</h4>
                                <p className='font-nanum max-w-[40ch]'>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                            </div>
                        </div>
                    </div>
                    {/* buttons container */}
                    <div className='flex flex-row w-full items-end  justify-end gap-8'>
                        {/* <button className=''>
                                Añadir al carrito
                            </button> */}
                        <PrimaryButton>
                            Añadir al carrito
                        </PrimaryButton>
                        <PrimaryButton>
                            Comprar ahora
                        </PrimaryButton>
                    </div>
                </aside>
            </section>
    )
}