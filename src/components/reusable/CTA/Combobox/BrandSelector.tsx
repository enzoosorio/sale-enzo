"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Check, ChevronDown, Loader2 } from "lucide-react";
import { BrandInput } from "@/types/products/product_form_data";
import { searchBrands } from "@/actions/brands";

interface Brand {
  name: string;
}

interface BrandSelectorProps {
  value: string;
  onChange: (brand: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function BrandSelector({
  value,
  onChange,
  onError,
  disabled = false,
  required = false
}: BrandSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update search query when value changes externally
  useEffect(() => {
    if (value) {
      setSearchQuery(value);
    } else {
      setSearchQuery("");
    }
  }, [value]);

  // Load initial brands (last 5)
  useEffect(() => {
    loadCategories();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadCategories = async (query?: string) => {
    setIsLoading(true);
    setError(null);

    const result = await searchBrands(query);

    if (result.success && result.data) {
      setBrands(result.data);
    } else {
      const errorMsg = result.error || "Error al cargar categorías";
      setError(errorMsg);
      onError?.(errorMsg);
    }

    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsOpen(true);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce search
    debounceTimerRef.current = setTimeout(() => {
      loadCategories(query);
    }, 300);
  };

  const handleSelectCategory = (brand: Brand) => {
    setSearchQuery(brand.name);
    onChange(brand.name);
    setIsOpen(false);
  };

  const handleAddNewCategory = () => {
    if (!searchQuery.trim()) return;

    const brandName = searchQuery.trim();
    

    const brandInput: BrandInput = {
      name: brandName
    };

    onChange(brandName);
    setIsOpen(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (!searchQuery) {
      loadCategories();
    }
  };

  const exactMatch = brands.find(
    (brand) => brand.name.toLowerCase() === searchQuery.toLowerCase()
  );

  const showCreateOption = searchQuery.trim() && !exactMatch && !isLoading;

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={(e) => {
            if(e.key === 'Enter'){
              e.preventDefault();
              e.stopPropagation();
              
              if(showCreateOption) {
                handleAddNewCategory();
              }
            }
          }}
          placeholder="Ej: Nike... Las nuevas se crearán al guardar el producto."
          disabled={disabled}
          required={required}
          className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading && brands.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Cargando marcas...
            </div>
          ) : brands.length === 0 && !searchQuery ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No hay marcas. Escribe para crear una.
            </div>
          ) : brands.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No se encontraron marcas
            </div>
          ) : (
            <>
              {brands.map((brand, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectCategory(brand)}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <span className="text-sm text-gray-900">{brand.name}</span>
                  {value === brand.name && (
                     <Check className="w-4 h-4 text-gray-900" />
                  )}
                </button>
              ))}
            </>
          )}

          {/* Add New Option */}
          {showCreateOption && (
            <button
              type="button"
              onClick={handleAddNewCategory}
              className="w-full px-4 py-2.5 text-left border-t border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-900" />
                <span className="text-sm text-gray-900 font-medium">
                  Agregar "{searchQuery}" (se creará al guardar)
                </span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      )}

      {/* Helper Text */}
      {!error && (
        <p className="mt-1.5 text-xs text-gray-500">
          Escribe para buscar o agregar una marca nueva. Las nuevas se crearán al guardar el producto.
        </p>
      )}
    </div>
  );
}
