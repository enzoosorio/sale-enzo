"use client";

import { useState } from "react";

export const SuperBarraBusqueda = () => {
  const [message, setMessage] = useState("");
  return (
    <form
      role="search"
      aria-label="Buscar productos"
      className="super-barra-busqueda relative bg-white w-full max-w-[600px] mx-auto focus-within:shadow-xl min-h-10 shadow-lg flex items-center border border-black/30"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("La búsqueda semántica estará disponible próximamente. Puedes explorar el catálogo por categorías.");
      }}
    >
      <label htmlFor="catalog-search" className="sr-only">Buscar productos</label>
      <input id="catalog-search" type="search" className="min-w-0 flex-1 h-10 px-4 font-nanum outline-offset-2" placeholder="¿Qué estás buscando?" aria-describedby={message ? "search-status" : undefined} />
      <button type="submit" className="shrink-0 px-3 py-2 text-sm">Buscar</button>
      <p id="search-status" role="status" className={message ? "absolute top-full mt-2 bg-white p-3 shadow-lg text-sm z-30" : "sr-only"}>{message}</p>
    </form>
  );
};
