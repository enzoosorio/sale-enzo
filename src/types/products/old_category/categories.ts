export interface Images{
    src: string;
    alt: string;
}

export interface Categories{
    id: string; // UUID from database
    name: string;
    slug?: string; // Add slug from database
    referenceImages?: Images[]; // Make optional
}

export interface Filter{
    id : number;
    name: string;
}

export type Filters = [Filter, Filter];