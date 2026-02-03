import { ProductFormData, VariantFormData } from '@/types/products/product_form_data'
import { Plus } from 'lucide-react'

interface ItemsSectionProps {
    currentVariant: VariantFormData
    formData: ProductFormData
    setFormData: (data: ProductFormData) => void
    activeVariantIndex: number
}

export const ItemsSection = ({ currentVariant, formData, setFormData, activeVariantIndex }: ItemsSectionProps) => {

    // const [activeVariantItemIndex, setActiveVariantItemIndex] = useState(0);

    // const currentItem = formData.variants[activeVariantIndex].items[activeVariantItemIndex];

   const addItem = (variantIndex: number) => {
    const newVariants = [...formData.variants];
    newVariants[variantIndex].items.push({
      condition: "new",
      price: "",
      sku: "",
      stock: "",
      status: "available"
    });
    setFormData({ ...formData, variants: newVariants });
    // setActiveVariantItemIndex(newVariants[variantIndex].items.length - 1);
  };

  const removeItem = (variantIndex: number, itemIndex: number) => {
    if (formData.variants[variantIndex].items.length === 1) {
      alert("Cada variante debe tener al menos un item");
      return;
    }
    const newVariants = [...formData.variants];
    newVariants[variantIndex].items = newVariants[variantIndex].items.filter((_, i) => i !== itemIndex);
    setFormData({ ...formData, variants: newVariants });
    // if(activeVariantItemIndex >= newVariants[variantIndex].items.length) {
    //   setActiveVariantItemIndex(newVariants[variantIndex].items.length - 1);
    // }
  };

  const updateItem = (variantIndex: number, itemIndex: number, field: string, value: any) => {
    const newVariants = [...formData.variants];
    newVariants[variantIndex].items[itemIndex] = {
      ...newVariants[variantIndex].items[itemIndex],
      [field]: value
    };
    setFormData({ ...formData, variants: newVariants });
  }; 

  return (
    <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Items de Inventario</h4>
              <button
                type="button"
                onClick={() => addItem(activeVariantIndex)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
                Agregar Item
              </button>
            </div>

            {formData.variants[activeVariantIndex].items.map((item, itemIndex) => (
              <div key={itemIndex} className="p-4 bg-gray-50 rounded-lg mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Variante {activeVariantIndex + 1} Item {itemIndex + 1}
                  </span>
                  {formData.variants[activeVariantIndex].items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(activeVariantIndex, itemIndex)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Condición
                    </label>
                    <select
                      value={item.condition}
                      onChange={(e) => updateItem(activeVariantIndex, itemIndex, 'condition', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value="new">Nuevo</option>
                      <option value="used">Usado</option>
                      <option value="refurbished">Reacondicionado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Precio *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={item.price}
                      onChange={(e) => updateItem(activeVariantIndex, itemIndex, 'price', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={item.sku}
                      onChange={(e) => updateItem(activeVariantIndex, itemIndex, 'sku', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="SKU-123"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Stock
                    </label>
                    <input
                      type="number"
                      value={item.stock}
                      onChange={(e) => updateItem(activeVariantIndex, itemIndex, 'stock', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Estado
                    </label>
                    <select
                      value={item.status}
                      onChange={(e) => updateItem(activeVariantIndex, itemIndex, 'status', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value="available">Disponible</option>
                      <option value="sold">Vendido</option>
                      <option value="reserved">Reservado</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
  )
}
