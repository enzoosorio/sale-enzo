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
      className={`card-filters-panel
        overflow-y-auto overscroll-contain z-60 bg-white border border-black/15
        shadow-2xl p-6 md:p-8 rounded-t-4xl w-[min(500px,calc(100vw-1.5rem))] h-[75vh] md:h-[80vh] ${className || ''}
        flex flex-col items-start justify-start gap-10
        `}
    >
      {children}
    </div>
  )
}