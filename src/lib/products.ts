import { WholeProductStructure } from "@/types/products/products";

// export interface ProductRow {
//   id: UUID
//   name: string
//   brand: string
//   description: string | null
//   category_id: UUID | null
//   is_active: boolean
//   created_at: Timestamp
//   updated_at: Timestamp
// }

// export interface ProductVariantRow {
//   id: UUID
//   product_id: UUID
//   size: string | null
//   main_color_hex: string | null
//   main_color_category_id: UUID | null
//   main_img_url: string | null
//   gender: string | null
//   fit: string | null
//   metadata: Record<string, any> | null
//   created_at: Timestamp
// }

// export interface ProductItemRow {
//   id: UUID
//   variant_id: UUID
//   condition: ProductCondition
//   price: number
//   sku: string | null
//   stock: number
//   seller_id: UUID | null
//   status: ProductItemStatus
//   created_at: Timestamp
// }


export const products : WholeProductStructure[] = [
{
    id: '1',
    name: 'Polo Básico Rojo',
    description: 'Polo de algodón premium en color rojo vibrante',
    brand: 'Urban Essentials',
    category_id: 'cat-001',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variant: {
        id: 'v1',
        product_id: '1',
        size: 'L',
        main_color_hex: '#FF0000',
        main_color_category_id: 'color-red',
        main_img_url: '/images/products/polo-1.png',
        gender: 'Unisex',
        fit: 'Regular',
        metadata: null,
        created_at: new Date().toISOString(),
    },
    item: {
        id: 'i1',
        variant_id: 'v1',
        condition: 'new',
        price: 29.99,
        sku: 'SKU001',
        stock: 100,
        seller_id: '13',
        status: 'active',
        created_at: new Date().toISOString(),
    }
},
{
    id: '2',
    name: 'Polo Clásico Negro',
    description: 'Polo elegante en color negro, perfecto para cualquier ocasión',
    brand: 'Urban Essentials',
    category_id: 'cat-001',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variant: {
        id: 'v2',
        product_id: '2',
        size: 'M',
        main_color_hex: '#000000',
        main_color_category_id: 'color-black',
        main_img_url: '/images/products/polo-2.png',
        gender: 'Unisex',
        fit: 'Slim',
        metadata: null,
        created_at: new Date().toISOString(),
    },
    item: {
        id: 'i2',
        variant_id: 'v2',
        condition: 'new',
        price: 34.99,
        sku: 'SKU002',
        stock: 85,
        seller_id: '13',
        status: 'active',
        created_at: new Date().toISOString(),
    }
},
{
    id: '3',
    name: 'Polo Verde Natural',
    description: 'Polo en tono verde natural, ideal para un look casual',
    brand: 'Nature Wear',
    category_id: 'cat-001',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variant: {
        id: 'v3',
        product_id: '3',
        size: 'S',
        main_color_hex: '#228B22',
        main_color_category_id: 'color-green',
        main_img_url: '/images/products/polo-3.png',
        gender: 'Unisex',
        fit: 'Regular',
        metadata: null,
        created_at: new Date().toISOString(),
    },
    item: {
        id: 'i3',
        variant_id: 'v3',
        condition: 'new',
        price: 29.99,
        sku: 'SKU003',
        stock: 120,
        seller_id: '13',
        status: 'active',
        created_at: new Date().toISOString(),
    }
},
{
    id: '4',
    name: 'Polo Blanco Premium',
    description: 'Polo blanco de alta calidad con acabado impecable',
    brand: 'Premium Line',
    category_id: 'cat-001',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variant: {
        id: 'v4',
        product_id: '4',
        size: 'M',
        main_color_hex: '#FFFFFF',
        main_color_category_id: 'color-white',
        main_img_url: '/images/products/polo-1.png',
        gender: 'Unisex',
        fit: 'Regular',
        metadata: null,
        created_at: new Date().toISOString(),
    },
    item: {
        id: 'i4',
        variant_id: 'v4',
        condition: 'new',
        price: 39.99,
        sku: 'SKU004',
        stock: 95,
        seller_id: '13',
        status: 'active',
        created_at: new Date().toISOString(),
    }
},
{
    id: '5',
    name: 'Polo Azul Marino',
    description: 'Polo en azul marino profundo, versátil y elegante',
    brand: 'Ocean Style',
    category_id: 'cat-001',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variant: {
        id: 'v5',
        product_id: '5',
        size: 'XL',
        main_color_hex: '#000080',
        main_color_category_id: 'color-blue',
        main_img_url: '/images/products/polo-2.png',
        gender: 'Hombre',
        fit: 'Regular',
        metadata: null,
        created_at: new Date().toISOString(),
    },
    item: {
        id: 'i5',
        variant_id: 'v5',
        condition: 'new',
        price: 32.99,
        sku: 'SKU005',
        stock: 75,
        seller_id: '13',
        status: 'active',
        created_at: new Date().toISOString(),
    }
},
{
    id: '6',
    name: 'Camisa Formal Blanca',
    description: 'Camisa formal de corte clásico en blanco puro',
    brand: 'Executive Wear',
    category_id: 'cat-002',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variant: {
        id: 'v6',
        product_id: '6',
        size: 'L',
        main_color_hex: '#FFFFFF',
        main_color_category_id: 'color-white',
        main_img_url: '/images/products/polo-3.png',
        gender: 'Hombre',
        fit: 'Slim',
        metadata: null,
        created_at: new Date().toISOString(),
    },
    item: {
        id: 'i6',
        variant_id: 'v6',
        condition: 'new',
        price: 49.99,
        sku: 'SKU006',
        stock: 60,
        seller_id: '13',
        status: 'active',
        created_at: new Date().toISOString(),
    }
},
{
    id: '7',
    name: 'Camisa Casual Gris',
    description: 'Camisa casual en tono gris moderno',
    brand: 'Casual Club',
    category_id: 'cat-002',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variant: {
        id: 'v7',
        product_id: '7',
        size: 'M',
        main_color_hex: '#808080',
        main_color_category_id: 'color-gray',
        main_img_url: '/images/products/polo-3.png',
        gender: 'Unisex',
        fit: 'Regular',
        metadata: null,
        created_at: new Date().toISOString(),
    },
    item: {
        id: 'i7',
        variant_id: 'v7',
        condition: 'new',
        price: 44.99,
        sku: 'SKU007',
        stock: 55,
        seller_id: '13',
        status: 'active',
        created_at: new Date().toISOString(),
    }
},
{
    id: '8',
    name: 'Polo Deportivo Verde',
    description: 'Polo deportivo con tecnología de absorción de humedad',
    brand: 'Sport Active',
    category_id: 'cat-001',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variant: {
        id: 'v8',
        product_id: '8',
        size: 'L',
        main_color_hex: '#006400',
        main_color_category_id: 'color-green',
        main_img_url: '/images/products/polo-1.png',
        gender: 'Unisex',
        fit: 'Athletic',
        metadata: null,
        created_at: new Date().toISOString(),
    },
    item: {
        id: 'i8',
        variant_id: 'v8',
        condition: 'new',
        price: 37.99,
        sku: 'SKU008',
        stock: 80,
        seller_id: '13',
        status: 'active',
        created_at: new Date().toISOString(),
    }
},
{
    id: '9',
    name: 'Polo Minimalista Gris',
    description: 'Diseño minimalista en gris, perfecto para el día a día',
    brand: 'Minimalist Co',
    category_id: 'cat-001',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variant: {
        id: 'v9',
        product_id: '9',
        size: 'S',
        main_color_hex: '#A9A9A9',
        main_color_category_id: 'color-gray',
        main_img_url: '/images/products/polo-2.png',
        gender: 'Unisex',
        fit: 'Regular',
        metadata: null,
        created_at: new Date().toISOString(),
    },
    item: {
        id: 'i9',
        variant_id: 'v9',
        condition: 'new',
        price: 31.99,
        sku: 'SKU009',
        stock: 110,
        seller_id: '13',
        status: 'active',
        created_at: new Date().toISOString(),
    }
},
{
    id: '10',
    name: 'Camisa Azul Cielo',
    description: 'Camisa fresca en tono azul cielo, ideal para primavera',
    brand: 'Spring Collection',
    category_id: 'cat-002',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variant: {
        id: 'v10',
        product_id: '10',
        size: 'M',
        main_color_hex: '#87CEEB',
        main_color_category_id: 'color-blue',
        main_img_url: '/images/products/polo-3.png',
        gender: 'Unisex',
        fit: 'Regular',
        metadata: null,
        created_at: new Date().toISOString(),
    },
    item: {
        id: 'i10',
        variant_id: 'v10',
        condition: 'new',
        price: 42.99,
        sku: 'SKU010',
        stock: 70,
        seller_id: '13',
        status: 'active',
        created_at: new Date().toISOString(),
    }
},
{
    id: '11',
    name: 'Polo Vinotinto Elegante',
    description: 'Polo en tono vinotinto, sofisticado y moderno',
    brand: 'Elite Fashion',
    category_id: 'cat-001',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variant: {
        id: 'v11',
        product_id: '11',
        size: 'L',
        main_color_hex: '#800020',
        main_color_category_id: 'color-red',
        main_img_url: '/images/products/polo-3.png',
        gender: 'Unisex',
        fit: 'Slim',
        metadata: null,
        created_at: new Date().toISOString(),
    },
    item: {
        id: 'i11',
        variant_id: 'v11',
        condition: 'new',
        price: 36.99,
        sku: 'SKU011',
        stock: 65,
        seller_id: '13',
        status: 'active',
        created_at: new Date().toISOString(),
    }
},
{
    id: '12',
    name: 'Camisa Rayas Azules',
    description: 'Camisa con rayas azules y blancas, estilo clásico',
    brand: 'Classic Stripes',
    category_id: 'cat-002',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variant: {
        id: 'v12',
        product_id: '12',
        size: 'XL',
        main_color_hex: '#4169E1',
        main_color_category_id: 'color-blue',
        main_img_url: '/images/products/polo-1.png',
        gender: 'Hombre',
        fit: 'Regular',
        metadata: null,
        created_at: new Date().toISOString(),
    },
    item: {
        id: 'i12',
        variant_id: 'v12',
        condition: 'new',
        price: 45.99,
        sku: 'SKU012',
        stock: 50,
        seller_id: '13',
        status: 'active',
        created_at: new Date().toISOString(),
    }
},
];