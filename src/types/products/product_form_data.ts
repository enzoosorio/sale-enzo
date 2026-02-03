
export interface ProductFormData {
  name: string;
  description: string;
  brand: string;
  category_id: string;
  category_name: string;
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
    tag_ids: string[];
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
  tag_ids: string[]
}

export interface ItemFormData {
  condition: string
  price: string
  sku: string
  stock: string
  status: string
}