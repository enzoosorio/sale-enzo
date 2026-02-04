"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Check, ChevronDown, Loader2 } from "lucide-react";
import { searchSubcategories } from "@/actions/categories";
import { SubcategoryInput } from "@/types/products/product_form_data";

interface Subcategory {
  id: string;
  name: string;
  slug: string;
}

interface SubcategoryComboboxProps {
  value: SubcategoryInput;
  parentCategoryId: string | null | undefined;
  onChange: (subcategory: SubcategoryInput) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function SubcategoryCombobox({
  value,
  parentCategoryId,
  onChange,
  onError,
  disabled = false,
  required = false
}: SubcategoryComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update search query when value changes externally
  useEffect(() => {
    if (value?.name) {
      setSearchQuery(value.name);
    } else {
      setSearchQuery("");
    }
  }, [value?.name]);

  // Load subcategories when parent category changes
  useEffect(() => {
    if (parentCategoryId) {
      loadSubcategories();
    } else {
      setSubcategories([]);
      setSearchQuery("");
    }
  }, [parentCategoryId]);

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

  const loadSubcategories = async (query?: string) => {
    if (!parentCategoryId) return;

    setIsLoading(true);
    setError(null);

    const result = await searchSubcategories(parentCategoryId, query);

    if (result.success && result.data) {
      setSubcategories(result.data);
    } else {
      const errorMsg = result.error || "Error al cargar subcategorías";
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
      loadSubcategories(query);
    }, 300);
  };

  const handleSelectSubcategory = (subcategory: Subcategory) => {
    const subcategoryInput: SubcategoryInput = {
      name: subcategory.name,
      slug: subcategory.slug,
      id: subcategory.id
    };
    
    setSearchQuery(subcategory.name);
    onChange(subcategoryInput);
    setIsOpen(false);
  };

  const handleAddNewSubcategory = () => {
    if (!searchQuery.trim()) return;

    const subcategoryName = searchQuery.trim();
    
    // Generate slug from name
    const slug = subcategoryName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Remove duplicate hyphens

    const subcategoryInput: SubcategoryInput = {
      name: subcategoryName,
      slug: slug,
      id: null // New subcategory
    };

    onChange(subcategoryInput);
    setIsOpen(false);
  };

  const handleFocus = () => {
    if (!parentCategoryId) {
      setError("Primero selecciona una categoría");
      return;
    }
    setIsOpen(true);
    if (!searchQuery) {
      loadSubcategories();
    }
  };

  const exactMatch = subcategories.find(
    (sub) => sub.name.toLowerCase() === searchQuery.toLowerCase()
  );

  const showCreateOption = searchQuery.trim() && !exactMatch && !isLoading && parentCategoryId;

  const isDisabled = disabled || !parentCategoryId;

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
          placeholder={parentCategoryId ? "Buscar o agregar subcategoría..." : "Primero selecciona una categoría"}
          disabled={isDisabled}
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
      {isOpen && !isDisabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading && subcategories.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Cargando subcategorías...
            </div>
          ) : subcategories.length === 0 && !searchQuery ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No hay subcategorías. Escribe para crear una.
            </div>
          ) : subcategories.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No se encontraron subcategorías
            </div>
          ) : (
            <>
              {subcategories.map((subcategory) => (
                <button
                  key={subcategory.id}
                  type="button"
                  onClick={() => handleSelectSubcategory(subcategory)}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <span className="text-sm text-gray-900">{subcategory.name}</span>
                  {value?.id === subcategory.id && (
                    <Check className="w-4 h-4 text-gray-900" />
                  )}
                </button>
              ))}
            </>
          )}

          {/* Create New Option */}
          {showCreateOption && (
            <button
              type="button"
              onClick={handleAddNewSubcategory}
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
          {parentCategoryId 
            ? "Escribe para buscar o agregar una subcategoría nueva" 
            : "Selecciona una categoría primero"}
        </p>
      )}
    </div>
  );
}
