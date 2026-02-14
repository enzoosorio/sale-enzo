import { Filters } from "./Filters";
import { MostRelatedProduct } from "../MostRelatedProduct";
import { useEffect, useMemo, useState } from "react";
import { SizeFilter } from "./Size/SizeFilter";
import { products } from "@/lib/products";
import { getAvailableSizesByCategory as getAvailableSizes } from "@/utils/filters/getAvailableSizes";

interface AsideCategoriesFilterProps {
  categorySelected: string | null;
}


export const AsideCategoriesFilter = ({
  categorySelected,
}: AsideCategoriesFilterProps) => {
  const [currentFilters, setCurrentFilters] = useState<React.ReactElement[]>(
    []
  );

  useEffect(() => {
  
    const loadFiltersForCategory = async () => {
       if (categorySelected) {
      // Mapeo de categorías a funciones que generan filtros
      const filtersMap: Record<string, () => Promise<React.ReactElement[]>> = {
        POLOS: async () => {
          const availableSizes = await getAvailableSizes(categorySelected);
          // const availableColors = getAvailableColors(categorySelected);

          if (availableSizes.length === 0) return [];

          return [
            <SizeFilter
              key="size-polos"
              availableSizes={availableSizes}
              selectedSizes={[]}
            />,
            // Agrega más filtros específicos para POLOS aquí
          ];
        },
        CAMISAS: async () => {
          const availableSizes = await getAvailableSizes(categorySelected);
          if (availableSizes.length === 0) return [];

          return [
            <SizeFilter
              key="size-camisas"
              availableSizes={availableSizes}
              selectedSizes={[]}
            />,
            // Agrega más filtros específicos para CAMISAS aquí
          ];
        },
        TECNOLOGIA: async () => {
          // Esta categoría no tiene filtro de tallas
          return [
            // Aquí podrías agregar otros filtros como ColorFilter, BrandFilter, etc.
          ];
        },
        // Agrega más categorías según necesites
      };

      const filterFactory = filtersMap[categorySelected];
      const updatedFilters = filterFactory ? await filterFactory() : [];
      setCurrentFilters(updatedFilters);
    } else {
      setCurrentFilters([]);
    }
    }
    loadFiltersForCategory();

  }, [categorySelected]);

  return (
    <aside
      className={`aside-filters fixed -z-10 opacity-0 w-[70%] select-none  inset-y-0 h-screen right-0 left-auto flex items-center justify-center ${
        categorySelected
          ? "z-10 pointer-events-auto"
          : "z-0 pointer-events-none"
      }`}
    >
      {/* parte donde se muestren los filtrados y el most-related product. */}
      {categorySelected && (
        <div className="flex items-start h-max justify-start w-full max-w-4xl p-8 pointer-events-auto gap-8">
          <MostRelatedProduct />
          {/* aqui van los filtros dependiendo de la categorySelected */}
          <Filters
            availableFilters={currentFilters}
            categorySelected={categorySelected}
          />
        </div>
      )}
    </aside>
  );
};
