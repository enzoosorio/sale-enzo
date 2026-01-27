import React from 'react'
import { IndividualSize } from './IndividualSize';


interface SizeProps {
    availableSizes: string[];
    selectedSizes?: string[];
}

export const SizeFilter = ({ availableSizes, selectedSizes}: SizeProps) => {

  // const minSizesAvailable = 4;
  // const gridCols = availableSizes.length < minSizesAvailable ? minSizesAvailable : availableSizes.length;

  return (
    <ul className={`flex items-center justify-center gap-0 w-full`}>
        {
            availableSizes.map((size, index) => (
              <IndividualSize
              key={index}
              size={size}
              isSelected={selectedSizes?.find(selectedSize => selectedSize === size) ? true : false}
              />
            ))
        }
    </ul>
  )
}
