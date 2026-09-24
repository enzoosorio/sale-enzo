'use client';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { useCategoriesStore } from '@/store/categorySection';
import { loadCategoriesPanel, preloadCategoriesPanel } from './preloadCategories';

// CategoriesPanel carries GSAP and the category data layer. It is loaded lazily
// and warmed up as soon as the user points at (or touches) a trigger.
const CategoriesPanel = dynamic(
  () => loadCategoriesPanel().then((m) => m.CategoriesPanel),
  { ssr: false, loading: () => null },
);

export const CategoriesButton = () => {
  const showCategories = useCategoriesStore((s) => s.showCategories);
  const openPanel = useCategoriesStore((s) => s.openPanel);
  const closePanel = useCategoriesStore((s) => s.closePanel);

  return (
    <button
      type="button"
      className="cursor-pointer"
      aria-expanded={showCategories}
      onClick={() => (showCategories ? closePanel() : openPanel())}
      onPointerEnter={preloadCategoriesPanel}
      onFocus={preloadCategoriesPanel}
    >
      Categorías
    </button>
  );
};

/** Renders the panel for every breakpoint; the triggers live in the desktop nav and the mobile menu. */
export const CategoriesPanelHost = () => {
  const isPanelMounted = useCategoriesStore((s) => s.isPanelMounted);
  if (!isPanelMounted) return null;
  return createPortal(<CategoriesPanel />, document.body);
};
