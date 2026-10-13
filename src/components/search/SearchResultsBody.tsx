"use client";

import Link from "next/link";
import { ProductCard } from "@/components/main/products-layout/ProductCard";
import { useAISearchStore } from "@/store/searchStore";

/** Loading, results, empty and error states shared by every search surface. */
export function SearchResultsBody() {
  const status = useAISearchStore((state) => state.status);
  const results = useAISearchStore((state) => state.results);
  const submittedQuery = useAISearchStore((state) => state.submittedQuery);
  const search = useAISearchStore((state) => state.search);
  const close = useAISearchStore((state) => state.close);

  return (
    <>
      {status === "loading" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-label="Cargando productos">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="animate-pulse" aria-hidden="true">
              <div className="aspect-4/5 bg-[#EAE5DD]" />
              <div className="mt-3 h-4 w-4/5 bg-[#EAE5DD]" />
              <div className="mt-2 h-3 w-2/5 bg-[#EAE5DD]" />
            </div>
          ))}
        </div>
      ) : null}
      {status === "done" && results.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((product) => (
            <div key={product.variant.id} data-search-card>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : null}
      {status === "done" && results.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-prata text-xl">No encontramos prendas para esa búsqueda.</p>
          <p className="mt-2 font-inria text-sm text-[#6B635C]">Prueba con otra marca, deporte o tipo de prenda.</p>
          <Link href="/products" onClick={close} className="mt-4 inline-block border-b border-[#221C1C] font-inria text-sm">Ver todas las prendas</Link>
        </div>
      ) : null}
      {status === "error" ? (
        <div className="py-16 text-center" role="alert">
          <p className="font-prata text-xl">No pudimos buscar en este momento.</p>
          <button type="button" onClick={() => { void search(submittedQuery); }}
            className="mt-4 border-b border-[#221C1C] font-inria text-sm">Intentar de nuevo</button>
        </div>
      ) : null}
    </>
  );
}
