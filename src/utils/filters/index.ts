/**
 * Barrel export file for filter utilities
 * 
 * Este archivo centraliza todas las exportaciones de las utilidades de filtros,
 * facilitando la importación de múltiples funciones desde un solo lugar.
 * 
 * @example
 * import { 
 *   getParentCategories, 
 *   getAvailableSizesByCategory,
 *   getAvailableColorsByCategory 
 * } from '@/utils/filters';
 */

// Exportar funciones de categorías
export {
  getParentCategories,
  getSubcategoriesByParentId,
  getCategoriesWithSubcategories,
  getAllSubcategories,
  findParentCategoryBySubcategorySlug,
  validateCategoryHierarchy,
  validateCategoryHierarchyServer,
} from './categories';

// Exportar funciones de tamaños
export {
  getAvailableSizesByCategory,
  getAllAvailableSizes,
} from './getAvailableSizes';

// Exportar funciones de colores
export {
  getAvailableColorsByCategory,
  getAllAvailableColors,
  getPopularColors,
  type ColorOption,
} from './getAvailableColors';

// Exportar utilidades RPC para filtros dinámicos
export {
  getCategoryFiltersPayload,
  type CategoryFiltersRpcPayload,
  type CategoryFiltersRpcParams,
  type RpcAvailableFilters,
  type RpcMostRelatedVariant,
} from './rpcCategoryFilters';

// Exportar tipos adicionales
export type {
  FilterState,
  CategoryWithMetadata,
  FilterOptions,
  FilteredProductsResult,
  SortOption,
  ProductFilterParams,
  CategoryStats,
  FilterConfig,
  CategoryBreadcrumb,
  FilterQueryParams,
  FiltersApiResponse,
  ProductsApiResponse,
} from './types';
