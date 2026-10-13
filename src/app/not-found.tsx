import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Página no encontrada' };

/** Root 404: also what a missing product detail renders. */
export default function NotFound() {
  return <main className="flex min-h-screen items-center bg-off-white px-6 py-20 text-[#221C1C]">
    <section className="mx-auto w-full max-w-xl">
      <p className="mb-4 text-xs uppercase tracking-[0.25em] font-inria">Sale Enzo / 404</p>
      <h1 className="font-prata text-3xl md:text-5xl">No encontramos lo que buscabas</h1>
      <p className="my-6 font-inria">Puede que el enlace esté mal escrito o que la prenda ya se haya vendido. Mira lo que hay por ahora.</p>
      <div className="flex flex-wrap gap-x-6 gap-y-3 font-inria">
        <Link href="/products" className="underline underline-offset-4">Ver todas las prendas</Link>
        <Link href="/home" className="underline underline-offset-4">Volver al inicio</Link>
      </div>
    </section>
  </main>;
}
