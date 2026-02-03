import React from 'react'
import { ProductFormData } from '@/types/products/product_form_data';

interface ActionsSectionProps {
  isSubmitting: boolean
  setFormData: (data: ProductFormData) => void
  initialFormData: ProductFormData

}

export const ActionsSection = ({ isSubmitting, setFormData, initialFormData }: ActionsSectionProps) => {
  return (
    <div className="flex items-center justify-end gap-4 bg-white rounded-lg border border-gray-200 p-6">
            <button
              type="button"
              onClick={() => {
                if (confirm("¿Está seguro? Se perderán todos los cambios.")) {
                  setFormData(initialFormData);
                }
              }}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Reiniciar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creando..." : "Crear Producto"}
            </button>
          </div>
  )
}
