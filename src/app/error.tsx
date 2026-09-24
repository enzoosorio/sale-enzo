'use client';
import Link from 'next/link';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="mx-auto max-w-xl px-6 py-20">
    <h1 className="font-prata text-3xl">No pudimos cargar esta página</h1>
    <p className="my-6">Inténtalo de nuevo en unos momentos.</p>
    <div className="flex gap-6">
      <button onClick={reset} className="underline">Reintentar</button>
      <Link href="/home" className="underline">Volver al inicio</Link>
    </div>
  </section>;
}
