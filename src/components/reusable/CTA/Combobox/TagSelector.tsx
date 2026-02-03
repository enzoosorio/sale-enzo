"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Search, Loader2 } from "lucide-react";
import { searchTags, createTag, getTagsByIds } from "@/actions/tags";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface TagSelectorProps {
  value: string[]; // Array of tag IDs
  onChange: (tagIds: string[]) => void;
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
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load tags when component mounts or value changes
  useEffect(() => {
    if (value && value.length > 0) {
      loadSelectedTags(value);
    } else {
      setSelectedTags([]);
    }
  }, [value.join(',')]);

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

  const loadSelectedTags = async (tagIds: string[]) => {
    const result = await getTagsByIds(tagIds);
    if (result.success && result.data) {
      setSelectedTags(result.data);
    }
  };

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
    if (selectedTags.find(t => t.id === tag.id)) {
      // Already selected, ignore
      return;
    }

    const newSelectedTags = [...selectedTags, tag];
    setSelectedTags(newSelectedTags);
    onChange(newSelectedTags.map(t => t.id));
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleRemoveTag = (tagId: string) => {
    const newSelectedTags = selectedTags.filter(t => t.id !== tagId);
    setSelectedTags(newSelectedTags);
    onChange(newSelectedTags.map(t => t.id));
  };

  const handleCreateTag = async () => {
    if (!searchQuery.trim()) return;

    setIsCreating(true);
    setError(null);

    const result = await createTag(searchQuery.trim());

    if (result.success && result.data) {
      const newTag = result.data;
      const newSelectedTags = [...selectedTags, newTag];
      setSelectedTags(newSelectedTags);
      onChange(newSelectedTags.map(t => t.id));
      setAllTags([newTag, ...allTags]);
      setSearchQuery("");
      setIsOpen(false);
    } else {
      const errorMsg = result.error || "Error al crear etiqueta";
      setError(errorMsg);
      onError?.(errorMsg);
    }

    setIsCreating(false);
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

  const showCreateOption = searchQuery.trim() && !exactMatch && !isLoading;

  // Filter out already selected tags from dropdown
  const availableTags = allTags.filter(
    (tag) => !selectedTags.find(t => t.id === tag.id)
  );

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-900 rounded-lg text-sm"
            >
              <span>{tag.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
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
            placeholder="Buscar o crear etiqueta..."
            disabled={disabled || isCreating}
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

            {/* Create New Option */}
            {showCreateOption && (
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={isCreating}
                className="w-full px-4 py-2.5 text-left border-t border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 text-gray-900 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 text-gray-900" />
                  )}
                  <span className="text-sm text-gray-900 font-medium">
                    Crear "{searchQuery}"
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
          Selecciona etiquetas existentes o crea nuevas escribiendo su nombre
        </p>
      )}
    </div>
  );
}
