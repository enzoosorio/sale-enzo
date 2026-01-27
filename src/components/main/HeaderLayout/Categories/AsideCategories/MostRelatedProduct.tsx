import Image from "next/image";
import React from "react";

export const MostRelatedProduct = () => {
  return (
    <div className="max-w-[400px] w-full overlay-fade-drop py-8 ">
      <div className="w-max mx-auto flex flex-col  items-start justify-start gap-4">
        <Image
          src={"/images/products/polo-new-york.jpeg"}
          alt=""
          width={320}
          height={400}
          className="object-contain min-w-72 "
        />
        {/* TODO, todo esto debe tener una animacion de revelacion (no de crecimiento), de 
        izquierda a derecha. */}
        <div className="flex flex-col items-start justify-start gap-2 w-full">
          <div className="flex flex-col items-start justify-start gap-1 w-full">
            <div className="flex items-center justify-between w-full">
              <span className="font-inria font-light text-sm">Polo Shirt</span>
              <span className="font-inria font-light text-sm">-</span>
              <span className="font-inria font-light text-sm">
                New York Polo
              </span>
              {/* <span className='mt-2 font-inria font-light text-sm'>Polo Shirt</span> */}
            </div>
            <span className="font-inria font-light text-lg">$29.99</span>
          </div>
          <span className=" font-inria font-light text-sm">M</span>
          <span className="mt-2 font-inria font-light text-black/70 text-xs">&#42;producto aproximado según los filtros aplicados&#42;.</span>
        </div>
      </div>
    </div>
  );
};
