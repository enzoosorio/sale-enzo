import { create } from 'zustand'
import { ProductCategory } from '@/schema/categorySchema';
import { beginPanelHistory, endPanelHistory } from '@/components/main/HeaderLayout/Categories/categoryHistory';

interface CategoriesState {
    /** Open intent: drives the enter/exit animation. */
    showCategories: boolean;
    /** Panel stays mounted until its exit animation finishes. */
    isPanelMounted: boolean;
    openPanel: () => void;
    /** Closes the panel and restores the URL it was opened on; `then` runs once restored. */
    closePanel: (then?: () => void) => void;
    unmountPanel: () => void;
    setShowCategories: (showCategories: boolean) => void;
    parentCategories: ProductCategory[];
    setParentCategories: (categories: ProductCategory[]) => void;
    isLoadingCategories: boolean;
    setIsLoadingCategories: (isLoading: boolean) => void;
    subcategoriesByParent: Record<string, ProductCategory[]>;
    setSubcategories: (parentId: string, subcategories: ProductCategory[]) => void;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
    showCategories: false,
    isPanelMounted: false,
    openPanel: () => {
        if (get().showCategories || get().isPanelMounted) return;
        beginPanelHistory(() => set({ showCategories: false }));
        set({ isPanelMounted: true, showCategories: true });
    },
    closePanel: (then) => {
        if (!get().showCategories) return;
        set({ showCategories: false });
        endPanelHistory(then);
    },
    unmountPanel: () => set({ isPanelMounted: false }),
    setShowCategories: (showCategories: boolean) =>
        showCategories ? get().openPanel() : get().closePanel(),
    parentCategories: [],
    setParentCategories: (categories: ProductCategory[]) => set({ parentCategories: categories }),
    isLoadingCategories: false,
    setIsLoadingCategories: (isLoading: boolean) => set({ isLoadingCategories: isLoading }),
    subcategoriesByParent: {},
    setSubcategories: (parentId, subcategories) =>
        set((state) => ({
            subcategoriesByParent: { ...state.subcategoriesByParent, [parentId]: subcategories },
        })),
}));
