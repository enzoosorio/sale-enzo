export interface BrandInput {
  name: string;
}

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

export interface VariantMetadataInput {
  key: string;
  value: string;
}

export type ImagePosition = "random" | "front" | "back" | "logo_detail" | "close_detail";

export interface ProductFormData {
  name: string;
  description: string;
  enhanced_description?: string; // User-triggered enhanced description
  enhanced_description_en?: string; // Short English semantic version for multilingual retrieval
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
    metadata: Record<string, string>; // Will be populated from metadataInputs on submit
    metadataInputs: VariantMetadataInput[]; // Client-side form state for metadata
    
    items: Array<{
      condition: string;
      price: string;
      sku: string;
      stock: string;
      status: string;
    }>;

    secondary_images: File[];
    secondary_image_positions: ImagePosition[]; // Parallel array to secondary_images
    tags: TagInput[];
    secondary_colors: string[]; // Array of HEX color strings
  }>;
}

export interface VariantFormData {
  size: string
  gender: string
  fit: string
  main_img_url: string
  main_img_file: File | null
  main_color_hex: string
  metadataInputs: VariantMetadataInput[] // Client-side form state for metadata
  metadata: Record<string, string> // Will be populated from metadataInputs on submit
  items: ItemFormData[]
  secondary_images: File[]
  secondary_image_positions: ImagePosition[] // Parallel array to secondary_images
  tags: TagInput[]
  secondary_colors: string[] // Array of HEX color strings
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