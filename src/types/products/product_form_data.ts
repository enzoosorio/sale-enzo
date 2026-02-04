export interface CategoryInput {
  name: string;
  slug: string;
  id?: string | null; // If present, category exists; if undefined/null, category is new
}

export interface SubcategoryInput {
  name: string;
  slug: string;
  id?: string | null; // If present, subcategory exists; if undefined/null, subcategory is new
}

export interface ProductFormData {
  name: string;
  description: string;
  brand: string;
  category: CategoryInput;
  subcategory: SubcategoryInput;
  is_active: boolean;

  variants: Array<{
    size: string;
    gender: string;
    fit: string;
    main_img_url: string;
    main_img_file: File | null;
    main_color_hex: string;
    metadata: Record<string, any>;
    
    items: Array<{
      condition: string;
      price: string;
      sku: string;
      stock: string;
      status: string;
    }>;

    secondary_images: File[];
    tags: TagInput[];
  }>;
}

export interface VariantFormData {
  size: string
  gender: string
  fit: string
  main_img_url: string
  main_img_file: File | null
  main_color_hex: string
  metadata: Record<string, any>
  items: ItemFormData[]
  secondary_images: File[]
  tags: TagInput[]
}

export interface ItemFormData {
  condition: string
  price: string
  sku: string
  stock: string
  status: string
}

export interface TagInput {
  name: string;
  slug: string;
  tagId?: string | null; // If present, tag exists; if undefined/null, tag is new
}