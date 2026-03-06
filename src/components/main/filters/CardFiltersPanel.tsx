import React, { useEffect, useRef } from 'react'

interface CardFiltersPanelProps {
  children?: React.ReactNode;
  className?: string;
}

export const CardFiltersPanel = ({ children, className }: CardFiltersPanelProps) => {
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
      className={`card-filters-panel translate-y-full
        overflow-y-auto z-60 bg-white border border-black/15 
        shadow-lg p-8 rounded-t-4xl w-[500px] h-[80vh] ${className || ''}
        flex flex-col items-start justify-start gap-10
        `}
    >
      {children}
    </div>
  )
}