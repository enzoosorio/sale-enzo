"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Search, Loader2 } from "lucide-react";
import { searchTags } from "@/actions/tags";
import { TagInput } from "@/types/products/product_form_data";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface TagSelectorProps {
  value: TagInput[]; // Array of TagInput objects
  onChange: (tags: TagInput[]) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function TagSelector({
  value,
  onChange,
  onError,
  disabled = false
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // selectedTags is now derived from value prop (TagInput[])
  const selectedTags = value || [];

  // Load all tags initially
  useEffect(() => {
    loadAllTags();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadAllTags = async (query?: string) => {
    setIsLoading(true);
    setError(null);

    const result = await searchTags(query);

    if (result.success && result.data) {
      setAllTags(result.data);
    } else {
      const errorMsg = result.error || "Error al cargar etiquetas";
      setError(errorMsg);
      onError?.(errorMsg);
    }

    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce search
    debounceTimerRef.current = setTimeout(() => {
      loadAllTags(query);
    }, 300);
  };

  const handleSelectTag = (tag: Tag) => {
    if (selectedTags.find(t => t.name === tag.name)) {
      // Already selected, ignore
      return;
    }

    const newTagInput: TagInput = {
      name: tag.name,
      slug: tag.slug,
      tagId: tag.id // Tag exists - store its ID
    };

    const newSelectedTags = [...selectedTags, newTagInput];
    onChange(newSelectedTags);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleRemoveTag = (tagName: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    const newSelectedTags = selectedTags.filter(t => t.name !== tagName);
    onChange(newSelectedTags);
  };

  const handleAddNewTag = () => {
    if (!searchQuery.trim()) return;

    const tagName = searchQuery.trim();
    
    // Check if already selected
    if (selectedTags.find(t => t.name.toLowerCase() === tagName.toLowerCase())) {
      setSearchQuery("");
      setIsOpen(false);
      return;
    }

    // Generate slug from name
    const slug = tagName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Remove duplicate hyphens

    const newTagInput: TagInput = {
      name: tagName,
      slug: slug,
      tagId: null // Tag does not exist yet
    };

    const newSelectedTags = [...selectedTags, newTagInput];
    onChange(newSelectedTags);
    setSearchQuery("");
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (!searchQuery) {
      loadAllTags();
    }
  };

  const exactMatch = allTags.find(
    (tag) => tag.name.toLowerCase() === searchQuery.toLowerCase()
  );

  const alreadySelected = selectedTags.find(
    (t) => t.name.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  const showCreateOption = searchQuery.trim() && !exactMatch && !alreadySelected && !isLoading;

  // Filter out already selected tags from dropdown
  const availableTags = allTags.filter(
    (tag) => !selectedTags.find(t => t.name === tag.name)
  );

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag, index) => (
            <div
              key={`${tag.slug}-${index}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-900 rounded-lg text-sm"
            >
              <span>{tag.name}</span>
              {!tag.tagId && (
                <span className="text-xs text-gray-500">(nuevo)</span>
              )}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.name)}
                disabled={disabled}
                className="hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input with dropdown */}
      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                if (showCreateOption) {
                  handleAddNewTag();
                  // setIsOpen(false);
                }
              }
            }}
            placeholder="Buscar o agregar etiqueta..."
            disabled={disabled}
            className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {isLoading && availableTags.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Cargando etiquetas...
              </div>
            ) : availableTags.length === 0 && !searchQuery ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {selectedTags.length > 0 
                  ? "Todas las etiquetas seleccionadas" 
                  : "No hay etiquetas. Escribe para crear una."
                }
              </div>
            ) : availableTags.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No se encontraron etiquetas
              </div>
            ) : (
              <>
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleSelectTag(tag)}
                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                  >
                    <span className="text-sm text-gray-900">{tag.name}</span>
                    <Plus className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
                  </button>
                ))}
              </>
            )}

            {/* Add New Option */}
            {showCreateOption && (  
              <button
                type="button"
                onClick={() => { handleAddNewTag(); setIsOpen(false); }}
                className="w-full px-4 py-2.5 text-left border-t border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-gray-900" />
                  <span className="text-sm text-gray-900 font-medium">
                    Agregar "{searchQuery}"
                  </span>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Helper Text */}
      {!error && (
        <p className="text-xs text-gray-500">
          Selecciona etiquetas existentes o agrega nuevas. Las nuevas se crearán al guardar el producto.
        </p>
      )}
    </div>
  );
}
