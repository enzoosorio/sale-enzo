"use client";

import { useState, useEffect } from "react";
import { 
  searchCategories, 
  searchSubcategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory
} from "@/actions/categories";
import { CategoryImageManager } from "@/components/admin/CategoryImageManager";

interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  parent_id: string | null;
}

export default function CategoriesPage() {
  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Subcategory state
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Category | null>(null);
  const [subcategoryInput, setSubcategoryInput] = useState("");
  const [editingSubcategory, setEditingSubcategory] = useState<Category | null>(null);
  const [subcategoryLoading, setSubcategoryLoading] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load initial categories
  useEffect(() => {
    loadCategories();
  }, []);

  // Load subcategories when category changes
  useEffect(() => {
    if (selectedCategory) {
      loadSubcategories(selectedCategory.id);
    } else {
      setSubcategories([]);
      setSelectedSubcategory(null);
    }
  }, [selectedCategory]);

  const loadCategories = async (query?: string) => {
    setCategoryLoading(true);
    const result = await searchCategories(query);
    if (result.success && result.data) {
      setCategories(result.data);
    }
    setCategoryLoading(false);
  };

  const loadSubcategories = async (categoryId: string, query?: string) => {
    setSubcategoryLoading(true);
    const result = await searchSubcategories(categoryId, query);
    if (result.success && result.data) {
      setSubcategories(result.data);
    }
    setSubcategoryLoading(false);
  };

  const handleCreateCategory = async () => {
    if (!categoryInput.trim()) {
      setError("El nombre de la categoría es requerido");
      return;
    }

    setError(null);
    setSuccess(null);
    setCategoryLoading(true);

    const result = await createCategory(categoryInput);

    if (result.success && result.data) {
      setSuccess("Categoría creada exitosamente");
      setCategoryInput("");
      loadCategories();
    } else {
      setError(result.error || "Error al crear categoría");
    }

    setCategoryLoading(false);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryInput.trim()) return;

    setError(null);
    setSuccess(null);
    setCategoryLoading(true);

    const result = await updateCategory(editingCategory.id, categoryInput);

    if (result.success && result.data) {
      setSuccess("Categoría actualizada exitosamente");
      setEditingCategory(null);
      setCategoryInput("");
      loadCategories();
      if (selectedCategory?.id === editingCategory.id) {
        setSelectedCategory(result.data);
      }
    } else {
      setError(result.error || "Error al actualizar categoría");
    }

    setCategoryLoading(false);
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${category.name}"?`)) return;

    setError(null);
    setSuccess(null);
    setCategoryLoading(true);

    const result = await deleteCategory(category.id);

    if (result.success) {
      setSuccess("Categoría eliminada exitosamente");
      loadCategories();
      if (selectedCategory?.id === category.id) {
        setSelectedCategory(null);
      }
    } else {
      setError(result.error || "Error al eliminar categoría");
    }

    setCategoryLoading(false);
  };

  const handleCreateSubcategory = async () => {
    if (!selectedCategory) {
      setError("Primero selecciona una categoría");
      return;
    }

    if (!subcategoryInput.trim()) {
      setError("El nombre de la subcategoría es requerido");
      return;
    }

    setError(null);
    setSuccess(null);
    setSubcategoryLoading(true);

    const result = await createSubcategory(selectedCategory.id, subcategoryInput);

    if (result.success && result.data) {
      setSuccess("Subcategoría creada exitosamente");
      setSubcategoryInput("");
      loadSubcategories(selectedCategory.id);
    } else {
      setError(result.error || "Error al crear subcategoría");
    }

    setSubcategoryLoading(false);
  };

  const handleUpdateSubcategory = async () => {
    if (!editingSubcategory || !subcategoryInput.trim()) return;

    setError(null);
    setSuccess(null);
    setSubcategoryLoading(true);

    const result = await updateSubcategory(editingSubcategory.id, subcategoryInput);

    if (result.success && result.data) {
      setSuccess("Subcategoría actualizada exitosamente");
      setEditingSubcategory(null);
      setSubcategoryInput("");
      if (selectedCategory) {
        loadSubcategories(selectedCategory.id);
      }
      if (selectedSubcategory?.id === editingSubcategory.id) {
        setSelectedSubcategory(result.data);
      }
    } else {
      setError(result.error || "Error al actualizar subcategoría");
    }

    setSubcategoryLoading(false);
  };

  const handleDeleteSubcategory = async (subcategory: Category) => {
    if (!confirm(`¿Estás seguro de eliminar la subcategoría "${subcategory.name}"?`)) return;

    setError(null);
    setSuccess(null);
    setSubcategoryLoading(true);

    const result = await deleteSubcategory(subcategory.id);

    if (result.success) {
      setSuccess("Subcategoría eliminada exitosamente");
      if (selectedCategory) {
        loadSubcategories(selectedCategory.id);
      }
      if (selectedSubcategory?.id === subcategory.id) {
        setSelectedSubcategory(null);
      }
    } else {
      setError(result.error || "Error al eliminar subcategoría");
    }

    setSubcategoryLoading(false);
  };

  const startEditingCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryInput(category.name);
    setError(null);
    setSuccess(null);
  };

  const cancelEditingCategory = () => {
    setEditingCategory(null);
    setCategoryInput("");
    setError(null);
  };

  const startEditingSubcategory = (subcategory: Category) => {
    setEditingSubcategory(subcategory);
    setSubcategoryInput(subcategory.name);
    setError(null);
    setSuccess(null);
  };

  const cancelEditingSubcategory = () => {
    setEditingSubcategory(null);
    setSubcategoryInput("");
    setError(null);
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-prata font-bold text-gray-900 mb-2">
            Gestión de Categorías
          </h1>
          <p className="text-gray-600">
            Administra categorías, subcategorías y sus imágenes de hover
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Categories Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-prata font-bold text-gray-900 mb-4">
              Categorías
            </h2>

            {/* Create/Edit Category Form */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      editingCategory ? handleUpdateCategory() : handleCreateCategory();
                    } else if (e.key === "Escape") {
                      cancelEditingCategory();
                    }
                  }}
                  placeholder="Nombre de la categoría..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                {editingCategory ? (
                  <>
                    <button
                      onClick={handleUpdateCategory}
                      disabled={categoryLoading}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                      Actualizar
                    </button>
                    <button
                      onClick={cancelEditingCategory}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleCreateCategory}
                    disabled={categoryLoading}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    Crear
                  </button>
                )}
              </div>
            </div>

            {/* Categories List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Categorías Existentes
              </h3>
              {categoryLoading && categories.length === 0 ? (
                <p className="text-sm text-gray-500">Cargando...</p>
              ) : categories.length === 0 ? (
                <p className="text-sm text-gray-500">No hay categorías todavía</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className={`p-3 border rounded-lg transition-all cursor-pointer ${
                        selectedCategory?.id === category.id
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{category.name}</p>
                          <p className="text-xs text-gray-500">{category.slug}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingCategory(category);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Editar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(category);
                            }}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subcategories Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-prata font-bold text-gray-900 mb-4">
              Subcategorías
            </h2>

            {selectedCategory ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Categoría: <span className="font-medium">{selectedCategory.name}</span>
                </p>

                {/* Create/Edit Subcategory Form */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editingSubcategory ? "Editar Subcategoría" : "Nueva Subcategoría"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={subcategoryInput}
                      onChange={(e) => setSubcategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          editingSubcategory ? handleUpdateSubcategory() : handleCreateSubcategory();
                        } else if (e.key === "Escape") {
                          cancelEditingSubcategory();
                        }
                      }}
                      placeholder="Nombre de la subcategoría..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    {editingSubcategory ? (
                      <>
                        <button
                          onClick={handleUpdateSubcategory}
                          disabled={subcategoryLoading}
                          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                          Actualizar
                        </button>
                        <button
                          onClick={cancelEditingSubcategory}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleCreateSubcategory}
                        disabled={subcategoryLoading}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                      >
                        Crear
                      </button>
                    )}
                  </div>
                </div>

                {/* Subcategories List */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Subcategorías de {selectedCategory.name}
                  </h3>
                  {subcategoryLoading && subcategories.length === 0 ? (
                    <p className="text-sm text-gray-500">Cargando...</p>
                  ) : subcategories.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay subcategorías todavía</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {subcategories.map((subcategory) => (
                        <div
                          key={subcategory.id}
                          className={`p-3 border rounded-lg transition-all cursor-pointer ${
                            selectedSubcategory?.id === subcategory.id
                              ? "border-gray-900 bg-gray-50"
                              : "border-gray-200 hover:border-gray-400"
                          }`}
                          onClick={() => {
                            if (selectedSubcategory?.id === subcategory.id) {
                              setSelectedSubcategory(null);
                            } else {
                              setSelectedSubcategory(subcategory);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{subcategory.name}</p>
                              <p className="text-xs text-gray-500">{subcategory.slug}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingSubcategory(subcategory);
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                Editar
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubcategory(subcategory);
                                }}
                                className="text-sm text-red-600 hover:text-red-800"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Selecciona una categoría para ver sus subcategorías</p>
              </div>
            )}
          </div>
        </div>

        {/* Category/Subcategory Images Section */}
        <CategoryImageManager
          categoryId={selectedSubcategory?.id || selectedCategory?.id || null}
          categoryName={selectedSubcategory?.name || selectedCategory?.name || null}
          isSubcategory={!!selectedSubcategory}
        />
      </div>
    </main>
  );
}
