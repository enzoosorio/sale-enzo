import { CardFiltersPanel } from './CardFiltersPanel'
import { SizeFilterSection } from './sections/SizeFilterSection'
import { ColorFilterSection } from './sections/ColorFilterSection'
import { BrandFilterSection } from './sections/BrandFilterSection'
import { GenderFilterSection } from './sections/GenderFilterSection'
import { TagsFilterSection } from './sections/TagsFilterSection'
import { PriceFilterSection } from './sections/PriceFilterSection'
import { useState } from 'react'

interface PriceFilterProps{
  min: number;
  max: number;
  value: [number, number];
  onChange?: (value: [number, number]) => void;
}

// Mock data for demonstration
const mockSizes = ['S', 'M', 'L'];
const mockColors = [
  { name: 'Smooch Rouge', hex: '#249458' },
  { name: 'Rosado Salmón', hex: '#D63B57' },
  { name: 'Negro Profundo', hex: '#1F1F1a' },
  { name: 'Azul Light', hex: '#E2E4F7' },
];
const mockBrands = ['Nike', 'Adidas', 'Under Armour', 'Reebok', 'New Balance'];
const mockGenders = ['Masculino', 'Femenino', 'Unisex'];
const mockTags = ['Deportivo', 'Soporte tradicional', 'Casual', 'Vintage', 'Oversize', 'Soporte tradicional2', 'Soporte tradicional3'];

export const AllFiltersPanel = () => {

  const [priceValue, setPriceValue] = useState<[number,number]>([0, 150]);

  return (
    <CardFiltersPanel className='px-2'>
      <SizeFilterSection 
        sizes={mockSizes}
        selectedSizes={[]}
        onToggleSize={(size) => console.log('Toggle size:', size)}
      />
      
      <ColorFilterSection 
        colors={mockColors}
        selectedColors={[]}
        onToggleColor={(color) => console.log('Toggle color:', color)}
      />
      
      <BrandFilterSection 
        brands={mockBrands}
        selectedBrands={[]}
        onToggleBrand={(brand) => console.log('Toggle brand:', brand)}
      />
      
      <GenderFilterSection 
        genders={mockGenders}
        selectedGender={undefined}
        onSelectGender={(gender) => console.log('Select gender:', gender)}
      />
      
      <TagsFilterSection 
        tags={mockTags}
        selectedTags={[]}
        onToggleTag={(tag) => console.log('Toggle tag:', tag)}
      />
      
      <PriceFilterSection 
        min={0}
        max={150}
        value={priceValue}
        onChange={(value) => {
          setPriceValue(value)
        }}
      />
    </CardFiltersPanel>
  )
}
