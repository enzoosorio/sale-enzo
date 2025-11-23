import { Images } from '@/types/categories';
import {create} from 'zustand'

interface ImagesCategoriesState {
    imagesByCategory: Images[];
    setImagesByCategory: (images: Images[]) => void;
    //exit booleano true or false para hacer animaciones exit antes de limpiar el array
    exitImagesByCategory: boolean;
    setExitImagesByCategory: (bool: boolean) => void;
}

export const useImagesCategoriesStore = create<ImagesCategoriesState>((set) => ({
    imagesByCategory: [],
    setImagesByCategory: (images: Images[]) => set({imagesByCategory: images}),
    exitImagesByCategory: false,
    setExitImagesByCategory: (bool: boolean) => set({ exitImagesByCategory: bool }) 
}));
