"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Check, ChevronDown, Loader2 } from "lucide-react";
import { searchCategories, createCategory } from "@/actions/categories";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryComboboxProps {
  value: string; // Category ID
  onChange: (categoryId: string, categoryName: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function CategoryCombobox({
  value,
  onChange,
  onError,
  disabled = false,
  required = false
}: CategoryComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial categories (last 5)
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

    const result = await searchCategories(query);

    if (result.success && result.data) {
      setCategories(result.data);
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

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    setSearchQuery(category.name);
    onChange(category.id, category.name);
    setIsOpen(false);
  };

  const handleCreateCategory = async () => {
    if (!searchQuery.trim()) return;

    setIsCreating(true);
    setError(null);

    const result = await createCategory(searchQuery.trim());

    if (result.success && result.data) {
      const newCategory = result.data;
      setSelectedCategory(newCategory);
      setSearchQuery(newCategory.name);
      onChange(newCategory.id, newCategory.name);
      setCategories([newCategory, ...categories]);
      setIsOpen(false);
    } else {
      const errorMsg = result.error || "Error al crear categoría";
      setError(errorMsg);
      onError?.(errorMsg);
    }

    setIsCreating(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (!searchQuery) {
      loadCategories();
    }
  };

  const exactMatch = categories.find(
    (cat) => cat.name.toLowerCase() === searchQuery.toLowerCase()
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
          placeholder="Buscar o crear categoría..."
          disabled={disabled || isCreating}
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
          {isLoading && categories.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Cargando categorías...
            </div>
          ) : categories.length === 0 && !searchQuery ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No hay categorías. Escribe para crear una.
            </div>
          ) : categories.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No se encontraron categorías
            </div>
          ) : (
            <>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelectCategory(category)}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <span className="text-sm text-gray-900">{category.name}</span>
                  {selectedCategory?.id === category.id && (
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
              onClick={handleCreateCategory}
              disabled={isCreating}
              className="w-full px-4 py-2.5 text-left border-t border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                {isCreating ? (
                  <Loader2 className="w-4 h-4 text-gray-900 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-gray-900" />
                )}
                <span className="text-sm text-gray-900 font-medium">
                  Crear "{searchQuery}"
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
          Escribe para buscar o crear una categoría nueva
        </p>
      )}
    </div>
  );
}
