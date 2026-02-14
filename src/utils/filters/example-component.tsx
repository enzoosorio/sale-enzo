/**
 * EJEMPLO DE COMPONENTE - Sistema de Filtros de Productos
 * 
 * Este archivo es un ejemplo de cómo usar las funciones de filtros
 * en un componente React con Next.js.
 * 
 * NO es necesario usar este componente tal cual, es solo una referencia.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  getParentCategories,
  getSubcategoriesByParentId,
  getAvailableSizesByCategory,
  getAvailableColorsByCategory,
  type ColorOption,
} from '@/utils/filters';
import { ProductCategory } from '@/schema/categorySchema';

/**
 * Componente de ejemplo que muestra un sistema de filtros completo
 */
export function ProductFiltersExample() {
  // Estados para categorías
  const [parentCategories, setParentCategories] = useState<ProductCategory[]>([]);
  const [selectedParentCategory, setSelectedParentCategory] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<ProductCategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Estados para filtros
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<ColorOption[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar categorías padre al montar el componente
  useEffect(() => {
    async function loadParentCategories() {
      try {
        setLoading(true);
        const categories = await getParentCategories();
        setParentCategories(categories);
      } catch (err) {
        console.error('Error loading categories:', err);
        setError('Error al cargar las categorías');
      } finally {
        setLoading(false);
      }
    }

    loadParentCategories();
  }, []);

  // Cargar subcategorías cuando se selecciona una categoría padre
  useEffect(() => {
    if (!selectedParentCategory) {
      setSubcategories([]);
      return;
    }

    async function loadSubcategories() {
      try {
        // TypeScript check: selectedParentCategory is definitely not null here
        const subs = await getSubcategoriesByParentId(selectedParentCategory!);
        setSubcategories(subs);
        
        // Resetear subcategoría seleccionada
        setSelectedSubcategory(null);
        setAvailableSizes([]);
        setAvailableColors([]);
      } catch (err) {
        console.error('Error loading subcategories:', err);
      }
    }

    loadSubcategories();
  }, [selectedParentCategory]);

  // Cargar tamaños y colores cuando se selecciona una subcategoría
  useEffect(() => {
    if (!selectedSubcategory) {
      setAvailableSizes([]);
      setAvailableColors([]);
      return;
    }

    async function loadFilters() {
      try {
        // Cargar tamaños y colores en paralelo
        // TypeScript check: selectedSubcategory is definitely not null here
        const [sizes, colors] = await Promise.all([
          getAvailableSizesByCategory(selectedSubcategory!),
          getAvailableColorsByCategory(selectedSubcategory!),
        ]);

        setAvailableSizes(sizes);
        setAvailableColors(colors);
        
        // Resetear selecciones
        setSelectedSizes([]);
        setSelectedColors([]);
      } catch (err) {
        console.error('Error loading filters:', err);
      }
    }

    loadFilters();
  }, [selectedSubcategory]);

  // Handlers
  const handleParentCategoryClick = (categoryId: string) => {
    setSelectedParentCategory(
      selectedParentCategory === categoryId ? null : categoryId
    );
  };

  const handleSubcategoryClick = (subcategoryId: string) => {
    setSelectedSubcategory(
      selectedSubcategory === subcategoryId ? null : subcategoryId
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size)
        ? prev.filter((s) => s !== size)
        : [...prev, size]
    );
  };

  const toggleColor = (colorId: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorId)
        ? prev.filter((c) => c !== colorId)
        : [...prev, colorId]
    );
  };

  const clearAllFilters = () => {
    setSelectedParentCategory(null);
    setSelectedSubcategory(null);
    setSelectedSizes([]);
    setSelectedColors([]);
    setSubcategories([]);
    setAvailableSizes([]);
    setAvailableColors([]);
  };

  // Renderizado
  if (loading) {
    return (
      <div className="p-4">
        <p>Cargando filtros...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Filtros de Productos</h2>
        <button
          onClick={clearAllFilters}
          className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Limpiar Filtros
        </button>
      </div>

      {/* Categorías Padre */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Categorías</h3>
        <div className="flex flex-wrap gap-2">
          {parentCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleParentCategoryClick(category.id)}
              className={`px-4 py-2 rounded border transition-colors ${
                selectedParentCategory === category.id
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Subcategorías */}
      {subcategories.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Subcategorías</h3>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((subcategory) => (
              <button
                key={subcategory.id}
                onClick={() => handleSubcategoryClick(subcategory.id)}
                className={`px-4 py-2 rounded border transition-colors ${
                  selectedSubcategory === subcategory.id
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {subcategory.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tamaños */}
      {availableSizes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Tamaños</h3>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className={`px-4 py-2 rounded border transition-colors ${
                  selectedSizes.includes(size)
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Colores */}
      {availableColors.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Colores</h3>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((color) => (
              <button
                key={color.id}
                onClick={() => toggleColor(color.id)}
                className={`relative px-4 py-2 rounded border transition-all ${
                  selectedColors.includes(color.id)
                    ? 'border-4 border-black'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                title={`${color.label} (${color.count} productos)`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border border-gray-300"
                    style={{ backgroundColor: color.representative_hex }}
                  />
                  <span className="text-sm">
                    {color.label} <span className="text-gray-500">({color.count})</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resumen de filtros seleccionados */}
      {(selectedParentCategory || selectedSizes.length > 0 || selectedColors.length > 0) && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="text-md font-semibold mb-2">Filtros Activos:</h3>
          <div className="flex flex-col gap-1 text-sm">
            {selectedParentCategory && (
              <p>
                <strong>Categoría:</strong>{' '}
                {parentCategories.find((c) => c.id === selectedParentCategory)?.name}
              </p>
            )}
            {selectedSubcategory && (
              <p>
                <strong>Subcategoría:</strong>{' '}
                {subcategories.find((c) => c.id === selectedSubcategory)?.name}
              </p>
            )}
            {selectedSizes.length > 0 && (
              <p>
                <strong>Tamaños:</strong> {selectedSizes.join(', ')}
              </p>
            )}
            {selectedColors.length > 0 && (
              <p>
                <strong>Colores:</strong>{' '}
                {selectedColors
                  .map((id) => availableColors.find((c) => c.id === id)?.label)
                  .join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Aquí irían los productos filtrados */}
      <div className="mt-6 p-4 border border-dashed border-gray-300 rounded">
        <p className="text-gray-500 text-center">
          Aquí se mostrarían los productos filtrados según la selección
        </p>
      </div>
    </div>
  );
}

/**
 * EJEMPLO DE USO EN UNA PÁGINA:
 * 
 * // app/productos/page.tsx
 * import { ProductFiltersExample } from '@/components/ProductFiltersExample';
 * 
 * export default function ProductsPage() {
 *   return (
 *     <div>
 *       <h1>Catálogo de Productos</h1>
 *       <ProductFiltersExample />
 *     </div>
 *   );
 * }
 */
