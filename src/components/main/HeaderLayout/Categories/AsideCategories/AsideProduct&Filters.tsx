  import { Filters } from "./Filters/Filters";
  import { MostRelatedProduct } from "./MostRelatedProduct";
  import { useEffect, useMemo, useState, useRef } from "react";
  // import { SizeFilter } from "./Size/SizeFilter";
  import { products } from "@/lib/products";
  import { getAvailableSizesByCategory as getAvailableSizes } from "@/utils/filters/getAvailableSizes";
  import gsap from "gsap";
  import { SizeFilter } from "./Filters/Size/SizeFilter";
  import { PriceSlider } from "../Filters/PriceSlider";
  import { OverviewProduct } from "@/components/main/filters/OverviewProduct";
  import { AllFiltersPanel } from "@/components/main/filters/AllFiltersPanel";

  interface AsideCategoriesFilterProps {
    categorySelected: string | null;
  }


  export const AsideCategoriesFilter = ({
    categorySelected,
  }: AsideCategoriesFilterProps) => {
    const [currentFilters, setCurrentFilters] = useState<React.ReactElement[]>(
      []
    );
    const asideRef = useRef<HTMLElement>(null);

    // Initialize aside state on mount
    useEffect(() => {
      if (asideRef.current) {
        gsap.set(asideRef.current, {
          opacity: 0,
          x: 50,
          zIndex: -10,
          pointerEvents: "none",
        });
      }
    }, []);

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
        ref={asideRef}
        className="aside-filters fixed h-[80%] w-screen max-w-screen bottom-0 flex items-start justify-evenly"
      >
        <AllFiltersPanel/>
        <OverviewProduct/>
      </aside>
    );
  };
