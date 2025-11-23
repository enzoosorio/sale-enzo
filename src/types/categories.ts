export interface Categories{
    id: number;
    name: string;
    referenceImages: string[];
    filters?: Filters;
}

export interface Filter{
    id : number;
    name: string;
}

export type Filters = [Filter, Filter];