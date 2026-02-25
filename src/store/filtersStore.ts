import { create } from 'zustand';

interface FiltersState {
  category: string | null;
  subcategory: string | null;
  sizes: string[];
  colors: string[];
  gender: string | null;
  fit: string | null;
  setCategory: (value: string | null) => void;
  setSubcategory: (value: string | null) => void;
  setSizes: (values: string[]) => void;
  setColors: (values: string[]) => void;
  setGender: (value: string | null) => void;
  setFit: (value: string | null) => void;
  resetFilters: () => void;
}

export const useFiltersStore = create<FiltersState>((set) => ({
  category: null,
  subcategory: null,
  sizes: [],
  colors: [],
  gender: null,
  fit: null,
  setCategory: (value) => set({ category: value }),
  setSubcategory: (value) => set({ subcategory: value }),
  setSizes: (values) => set({ sizes: values }),
  setColors: (values) => set({ colors: values }),
  setGender: (value) => set({ gender: value }),
  setFit: (value) => set({ fit: value }),
  resetFilters: () => set({
    category: null,
    subcategory: null,
    sizes: [],
    colors: [],
    gender: null,
    fit: null,
  }),
}));
