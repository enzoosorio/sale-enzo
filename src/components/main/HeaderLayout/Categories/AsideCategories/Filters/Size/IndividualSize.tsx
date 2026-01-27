import React, { useState } from 'react'

interface IndividualSizeProps {
    isSelected: boolean;
    isNoStock?: boolean;
    size: string;
}

export const IndividualSize = ({ isSelected, isNoStock, size }: IndividualSizeProps) => {
  
  return (
    <li 
    className="p-1 min-w-12 min-h-12 px-4 flex items-center justify-center font-inria text-sm cursor-pointer relative overflow-hidden group">
        {/* Background base */}
        <span className="absolute inset-0 gradial-radient" />
        {/* Background hover con transición */}
        <span className="absolute inset-0 gradial-radient-hover opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out" />
        {/* Contenido */}
        <span className="relative z-10 text-base">{size}</span>
    </li>
  )
}
