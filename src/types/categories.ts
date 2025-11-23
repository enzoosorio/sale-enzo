export interface Images{
    src: string;
    alt: string;
}

export interface Categories{
    id: number;
    name: string;
    referenceImages: Images[];
    filters?: Filters;
}

export interface Filter{
    id : number;
    name: string;
}

export type Filters = [Filter, Filter];