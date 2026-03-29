import { CardFiltersPanel } from './CardFiltersPanel'
import { SizeFilterSection } from './sections/SizeFilterSection'
import { ColorFilterSection } from './sections/ColorFilterSection'
import { BrandFilterSection } from './sections/BrandFilterSection'
import { GenderFilterSection } from './sections/GenderFilterSection'
import { TagsFilterSection } from './sections/TagsFilterSection'
import { PriceFilterSection } from './sections/PriceFilterSection'
import { type RpcAvailableFilters } from '@/utils/filters/rpcCategoryFilters'
// import { FastNavSection } from './sections/FastNavSection'


// interface AvailableFilters extends RpcAvailableFilters {
//   subcategories: string[];
// }

interface AllFiltersPanelProps {
  isLoading?: boolean;
  availableFilters?: RpcAvailableFilters;
  selectedSizes?: string[];
  selectedColors?: string[];
  selectedBrands?: string[];
  selectedTags?: string[];
  selectedGender?: string;
  selectedSubcategories?: string[];
  priceValue?: [number, number];
  onToggleSize?: (size: string) => void;
  onToggleColor?: (color: string) => void;
  onToggleBrand?: (brand: string) => void;
  onToggleTag?: (tag: string) => void;
  onSelectGender?: (gender: string) => void;
  onChangePrice?: (value: [number, number]) => void;
  onToggleSubcategory?: (subcategoryId: string) => void;
}

export const AllFiltersPanel = ({
  isLoading = false,
  availableFilters,
  selectedSizes = [],
  selectedColors = [],
  selectedBrands = [],
  selectedTags = [],
  selectedGender,
  selectedSubcategories = [],
  priceValue = [0, 150],
  onToggleSize,
  onToggleColor,
  onToggleBrand,
  onToggleTag,
  onSelectGender,
  onChangePrice,
  onToggleSubcategory,
}: AllFiltersPanelProps) => {
  const sizeOptions = availableFilters?.sizes.map((size) => size.value) || [];
  const colorOptions =
    availableFilters?.colors.map((color) => ({
      name: color.label,
      hex: color.representative_hex,
    })) || [];
  const brandOptions = availableFilters?.brands.map((brand) => brand.value) || [];
  const genderOptions = availableFilters?.genders.map((gender) => gender.value) || [];
  const tagOptions =
    availableFilters?.tags
      .map((tag) => tag.slug || tag.name)
      .filter(Boolean) || [];

  const priceMin = availableFilters?.price_range.min ?? 0;
  const priceMax = availableFilters?.price_range.max ?? 150;
  const safeMin = Number.isFinite(priceMin) ? Number(priceMin) : 0;
  const safeMax = Number.isFinite(priceMax) ? Number(priceMax) : 150;

  const rangeMin = Math.floor(Math.min(safeMin, safeMax));
  const rangeMax = Math.ceil(Math.max(safeMin, safeMax));
  const normalizedMax = rangeMin === rangeMax ? rangeMax + 1 : rangeMax;

  const normalizedPriceValue: [number, number] = [
    Math.min(Math.max(priceValue[0], rangeMin), normalizedMax),
    Math.min(Math.max(priceValue[1], rangeMin), normalizedMax),
  ].sort((a, b) => a - b) as [number, number];

  return (
    <CardFiltersPanel className='px-2'>
      {/* TODO: PARA EL ISLOADING, AGREGAR UN SKELETON EN VEZ DE COLOCAR ESE CARGANDO FEO */}
      {isLoading && (
        <div className='w-full text-sm text-black/60 border border-black/10 px-4 py-3'>
          Cargando filtros dinamicos...
        </div>
      )}

      {/* <FastNavSection
        selectedSubcategories={selectedSubcategories}
        subcategories={availableFilters?.subcategories || []}
        onToggleSubcategory={onToggleSubcategory}
      /> */}

      <SizeFilterSection 
        sizes={sizeOptions}
        selectedSizes={selectedSizes}
        onToggleSize={onToggleSize}
      />
      
      <ColorFilterSection 
        colors={colorOptions}
        selectedColors={selectedColors}
        onToggleColor={onToggleColor}
      />
      
      <BrandFilterSection 
        brands={brandOptions}
        selectedBrands={selectedBrands}
        onToggleBrand={onToggleBrand}
      />
      
      <GenderFilterSection 
        genders={genderOptions}
        selectedGender={selectedGender}
        onSelectGender={onSelectGender}
      />
      
      <TagsFilterSection 
        tags={tagOptions}
        selectedTags={selectedTags}
        onToggleTag={onToggleTag}
      />
      
      <PriceFilterSection 
        min={rangeMin}
        max={normalizedMax}
        value={normalizedPriceValue}
        onChange={onChangePrice}
      />
    </CardFiltersPanel>
  )
}
