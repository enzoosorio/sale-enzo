import {create} from 'zustand'
import { ProductCategory } from '@/schema/categorySchema';

interface CategoriesState {
    showCategories: boolean;
    setShowCategories: (showCategories: boolean) => void;
    parentCategories: ProductCategory[];
    setParentCategories: (categories: ProductCategory[]) => void;
    isLoadingCategories: boolean;
    setIsLoadingCategories: (isLoading: boolean) => void;
}

export const useCategoriesStore = create<CategoriesState>((set) => ({
    showCategories: false,
    setShowCategories: (showCategories: boolean) => set({showCategories}),
    parentCategories: [],
    setParentCategories: (categories: ProductCategory[]) => set({parentCategories: categories}),
    isLoadingCategories: false,
    setIsLoadingCategories: (isLoading: boolean) => set({isLoadingCategories: isLoading}),
}));
