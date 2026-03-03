import React, { useEffect, useRef } from 'react'

interface CardFiltersPanelProps {
  children?: React.ReactNode;
}

export const CardFiltersPanel = ({ children }: CardFiltersPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const handleWheel = (e: WheelEvent) => {
      // Detener propagación para evitar que el infinite scroll capture el evento
      e.stopPropagation();
      
      // NO llamar preventDefault - queremos el scroll nativo
    };

    // Importante: passive: false para poder usar stopPropagation efectivamente
    panel.addEventListener('wheel', handleWheel);

    return () => {
      panel.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div 
      ref={panelRef}
      className='card-filters-panel absolute overflow-y-auto z-60 left-[10%] bg-amber-200 w-[500px] h-[80vh] top-0'
    >
      {children}
    </div>
  )
}