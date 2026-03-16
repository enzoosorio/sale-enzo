export interface BulkProductInput {
  name: string;
  description?: string;
  brand?: string;
  category: {
    name: string;
    slug: string;
    id?: string | null;
  };
  subcategory: {
    name: string;
    slug: string;
    id?: string | null;
  };
  is_active: boolean;
  variants: Array<{
    size?: string;
    gender?: string;
    fit?: string;
    main_img_url?: string;
    main_color_hex: string;
    metadata?: Record<string, string>;
    tags?: Array<{
      name: string;
      slug: string;
      tagId?: string | null;
    }>;
    secondary_colors?: string[];
    items: Array<{
      condition?: string;
      price: number;
      sku?: string;
      stock?: number;
      status?: string;
    }>;
  }>;
}

export interface BulkImportResult {
  success: boolean;
  inserted: number;
  failed: number;
  errors?: Array<{
    productName: string;
    error: string;
  }>;
}

export interface ProductPreview {
  name: string;
  brand?: string;
  category: string;
  subcategory: string;
  size?: string;
  color: string;
  price: number;
  stock?: number;
  image_url?: string;
}

export type BulkImportState = 
  | "idle" 
  | "parsing" 
  | "preview" 
  | "importing" 
  | "completed" 
  | "error";
