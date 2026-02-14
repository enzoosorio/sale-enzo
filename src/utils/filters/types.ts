/**
 * Tipos adicionales para el sistema de filtros
 * 
 * Este archivo complementa los tipos del schema con interfaces útiles
 * para trabajar con filtros, categorías y productos en la UI.
 */

import { ProductCategory } from '@/schema/categorySchema';
import { ProductVariant } from '@/schema/productVariantSchema';
import { ColorOption } from './getAvailableColors';

/**
 * Estado completo de filtros aplicados
 */
export interface FilterState {
  /** ID de categoría padre seleccionada */
  parentCategoryId: string | null;
  
  /** ID de subcategoría seleccionada */
  subcategoryId: string | null;
  
  /** Array de tamaños seleccionados */
  selectedSizes: string[];
  
  /** Array de IDs de colores seleccionados */
  selectedColorIds: string[];
  
  /** Rango de precios (opcional) */
  priceRange?: {
    min: number;
    max: number;
  };
  
  /** Filtros adicionales */
  gender?: string;
  fit?: string;
  brands?: string[];
  tags?: string[];
}

/**
 * Categoría con información adicional para UI
 */
export interface CategoryWithMetadata extends ProductCategory {
  /** Número de productos en esta categoría */
  productCount?: number;
  
  /** Número de subcategorías */
  subcategoryCount?: number;
  
  /** Subcategorías anidadas */
  subcategories?: ProductCategory[];
  
  /** URL de imagen para la categoría (opcional) */
  imageUrl?: string;
}

/**
 * Opciones disponibles para un filtro específico
 */
export interface FilterOptions {
  /** Tamaños disponibles con cantidad */
  sizes: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  
  /** Colores disponibles */
  colors: ColorOption[];
  
  /** Rango de precios disponible */
  priceRange: {
    min: number;
    max: number;
  };
  
  /** Géneros disponibles */
  genders: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  
  /** Fits disponibles */
  fits: Array<{
    value: string;
    label: string;
    count: number;
  }>;
}

/**
 * Resultado de una búsqueda/filtrado de productos
 */
export interface FilteredProductsResult {
  /** Productos que coinciden con los filtros */
  products: ProductVariant[];
  
  /** Total de productos encontrados */
  totalCount: number;
  
  /** Información de paginación */
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
  };
  
  /** Filtros que fueron aplicados */
  appliedFilters: FilterState;
  
  /** Opciones disponibles dado los filtros actuales */
  availableFilters: Partial<FilterOptions>;
}

/**
 * Configuración de ordenamiento
 */
export type SortOption = 
  | 'newest'          // Más recientes
  | 'oldest'          // Más antiguos
  | 'price-asc'       // Precio menor a mayor
  | 'price-desc'      // Precio mayor a menor
  | 'popular'         // Más populares
  | 'name-asc'        // Nombre A-Z
  | 'name-desc';      // Nombre Z-A

/**
 * Parámetros para filtrar productos
 */
export interface ProductFilterParams {
  /** Filtros a aplicar */
  filters: Partial<FilterState>;
  
  /** Ordenamiento */
  sort?: SortOption;
  
  /** Paginación */
  page?: number;
  pageSize?: number;
  
  /** Query de búsqueda (opcional) */
  searchQuery?: string;
}

/**
 * Estadísticas de una categoría
 */
export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  
  /** Total de productos */
  totalProducts: number;
  
  /** Total de variantes */
  totalVariants: number;
  
  /** Tamaños únicos */
  uniqueSizes: number;
  
  /** Colores únicos */
  uniqueColors: number;
  
  /** Rango de precios */
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
  
  /** Marcas disponibles */
  brands: string[];
}

/**
 * Configuración de un filtro para renderizado en UI
 */
export interface FilterConfig {
  /** ID único del filtro */
  id: string;
  
  /** Nombre visible del filtro */
  label: string;
  
  /** Tipo de filtro */
  type: 'select' | 'multiselect' | 'range' | 'color' | 'size';
  
  /** Opciones disponibles */
  options: Array<{
    value: string;
    label: string;
    count?: number;
    metadata?: Record<string, any>;
  }>;
  
  /** Si es colapsable en UI */
  collapsible?: boolean;
  
  /** Si está colapsado por defecto */
  defaultCollapsed?: boolean;
}

/**
 * Breadcrumb para navegación de categorías
 */
export interface CategoryBreadcrumb {
  id: string;
  name: string;
  slug: string;
  url: string;
}

/**
 * Helper type para query params de URL
 */
export interface FilterQueryParams {
  category?: string;
  subcategory?: string;
  sizes?: string; // comma-separated
  colors?: string; // comma-separated
  minPrice?: string;
  maxPrice?: string;
  gender?: string;
  fit?: string;
  sort?: SortOption;
  page?: string;
  search?: string;
}

/**
 * Respuesta de la API para filtros
 */
export interface FiltersApiResponse {
  success: boolean;
  data?: FilterOptions;
  error?: string;
  timestamp: string;
}

/**
 * Respuesta de la API para productos filtrados
 */
export interface ProductsApiResponse {
  success: boolean;
  data?: FilteredProductsResult;
  error?: string;
  timestamp: string;
}
