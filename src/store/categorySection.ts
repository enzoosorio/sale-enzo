import {create} from 'zustand'

interface CategoriesState {
    showCategories: boolean;
    setShowCategories: (showCategories: boolean) => void;
}

export const useCategoriesStore = create<CategoriesState>((set) => ({
    showCategories: false,
    setShowCategories: (showCategories: boolean) => set({showCategories}),
}));
