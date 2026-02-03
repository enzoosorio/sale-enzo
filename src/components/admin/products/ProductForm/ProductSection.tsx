import { CategoryCombobox } from "@/components/reusable/CTA/Combobox/CategoryCombobox"
import { ProductFormData } from "@/types/products/product_form_data"

interface ProductSectionProps {
  formData: ProductFormData
  setFormData: (data: ProductFormData) => void
  isSubmitting: boolean
  setError: (error: string) => void
}

export const ProductSection = ({ formData, setFormData, isSubmitting, setError }: ProductSectionProps) => {
  
  const handleCategoryChange = (categoryId: string, categoryName: string) => {
    setFormData({ 
      ...formData, 
      category_id: categoryId,
      category_name: categoryName
    });
  };
  
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-prata font-semibold mb-4 text-gray-900">
          Información del Producto
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Producto *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="ej: Camiseta de Algodón Clásica"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Describa su producto..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Marca
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="ej: Nike"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría *
            </label>
            <CategoryCombobox
              value={formData.category_id}
              onChange={handleCategoryChange}
              onError={(error) => setError(error)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Producto Activo
            </label>
          </div>
        </div>
      </section>
  )
}
