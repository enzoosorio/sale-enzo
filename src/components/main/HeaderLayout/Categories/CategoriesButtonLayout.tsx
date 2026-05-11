'use client';
import dynamic from 'next/dynamic';
import { useCategoriesStore } from '@/store/categorySection';
import { createPortal } from 'react-dom';

// CategoriesPanel contains GSAP + Flip + heavy SVG animations.
// It only mounts when the user opens the menu, so we load its JS lazily.
const CategoriesPanel = dynamic(
  () => import('./CategoriesPanel').then((m) => m.CategoriesPanel),
  { ssr: false, loading: () => null },
);

export const CategoriesButton = () => {
  const { showCategories, setShowCategories } = useCategoriesStore();

  return (
    <>
      <button
        className="cursor-pointer"
        onClick={() => setShowCategories(!showCategories)}
        onMouseEnter={() => {
          // TODO: pre-loader de categorías padre
        }}
      >
        Categorías
      </button>
      {showCategories &&
        createPortal(<CategoriesPanel />, document.body)}
    </>
  );
};
