import { TagSelector } from '@/components/reusable/CTA/Combobox/TagSelector'
import { VariantFormData, TagInput } from '@/types/products/product_form_data'
import React from 'react'

interface TagSectionProps {
  currentVariant: VariantFormData
  updateVariant: (variantIndex: number, field: string, value: any) => void
  isSubmitting: boolean
  activeVariantIndex: number
  setError: (error: string) => void
}

export const TagSection = ({
  currentVariant,
  updateVariant,
  isSubmitting,
  activeVariantIndex,
  setError
}: TagSectionProps) => {
  return (
    <div className="border-t border-gray-200 pt-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Etiquetas
      </label>
      <TagSelector
        value={currentVariant.tags}
        onChange={(tags: TagInput[]) => updateVariant(activeVariantIndex, 'tags', tags)}
        onError={(error) => setError(error)}
        disabled={isSubmitting}
      />
    </div>
  )
}
