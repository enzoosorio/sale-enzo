Actualmente el RPC de products_grid_v2 me esta obteniendo estos datos para las busquedas de filtrado dinamico:
(
sincronizacion entre 2 RPC's ejecutadas en https://vscode.dev/github/enzoosorio/sale-enzo/blob/master/src/app/(products)/products/page.tsx

Es la ruta pagina /products. La que renderiza en el servidor y sincroniza getProductsForGrid con getCategoryFiltersPayloadServer.
)

```JSON
{
    "products": [
        {
            "item": {
                "id": "0f6073c5-f72f-4b4e-8d3c-e25e3b684489",
                "sku": "SKU309219302",
                "price": 120,
                "stock": 1,
                "status": "reserved",
                "condition": "used",
                "seller_id": "10b146f4-5383-41af-be01-944834bb4c8f",
                "created_at": "2026-02-09T22:17:46.744578+00:00",
                "variant_id": "454729f0-c09a-4af5-a02b-3a4b4b79f03f"
            },
            "product": {
                "id": "37ebb784-0248-4a2c-9a55-0baf54931443",
                "name": "Nike Florida Gators Jersey Youth M Orange NCAA Football College #1",
                "brand": "Nike",
                "is_active": true,
                "created_at": "2026-02-09T22:17:45.876211+00:00",
                "updated_at": "2026-02-09T22:17:45.876211+00:00",
                "category_id": "bd36226f-8d24-4b9c-aca2-afb8772e1990",
                "description": "The product is a Nike Florida Gators jersey in size M, designed for youth boys who support the college football team. The jersey is officially licensed and features the vibrant orange color associated with the team. Perfect for young fans looking to show their allegiance to the Florida Gators on game days or during casual wear. Made with quality materials and the signature Nike branding, this jersey is a must-have for any Gators supporter."
            },
            "variant": {
                "id": "454729f0-c09a-4af5-a02b-3a4b4b79f03f",
                "fit": "relaxed",
                "size": "L",
                "gender": "unisex",
                "metadata": {
                    "team": "Florida Gators",
                    "color": "Orange",
                    "sport": "football"
                },
                "created_at": "2026-02-09T22:17:46.561655+00:00",
                "product_id": "37ebb784-0248-4a2c-9a55-0baf54931443",
                "main_img_url": "https://hdbhvgxogazmawphpcnj.supabase.co/storage/v1/object/public/variant-images/variants/454729f0-c09a-4af5-a02b-3a4b4b79f03f/main/main-image-1.webp",
                "main_color_hex": "#b83003",
                "main_color_category_id": "ed53a01a-46e4-466b-badd-ff3bce4a101a"
            }
        }
    ],
    "total_count": 1
}
```

Para todo esto, los datos renderizados, por cada producto en cada "card" solo son:

"main_img_url": "https://hdbhvgxogazmawphpcnj.supabase.co/storage/v1/object/public/variant-images/variants/454729f0-c09a-4af5-a02b-3a4b4b79f03f/main/main-image-1.webp",

la main_img_url dentro de variants: entiendo que es la imagen desplegada, dado que es la primera que se coloca en la card.



El name:
"name" de products: "Nike Florida Gators Jersey Youth M Orange NCAA Football College #1" Tambien se ve reflejado

El price: 
"price": 120,
tambien entra en la card

Por ultimo, la talla:
"size": "L".
Se esta viendo, ACTUALMENTE. 


Necesito ahora formatear mi obtencion de datos para:

mostrar un dato mas esencial: Estado del producto

No traer datos innecesarios.

Para mi entendimiento, los productos, al no necesitar ser agregados hasta que se pueda entrar en la vista individual de cada uno, existen ahora algunas propiedades "useless" que se están colando. Vamos a revisar parte por parte el cuerpo de la respuesta:

```JSON
"item": {
                "id": "0f6073c5-f72f-4b4e-8d3c-e25e3b684489",
                "sku": "SKU309219302",
                "price": 120,
                "stock": 1,
                "status": "reserved",
                "condition": "used",
                "seller_id": "10b146f4-5383-41af-be01-944834bb4c8f",
                "created_at": "2026-02-09T22:17:46.744578+00:00",
                "variant_id": "454729f0-c09a-4af5-a02b-3a4b4b79f03f"
            },

```

SKU, STOCK, STATUS, SELLER_ID, CREATED_AT, son totalmente innecesarios desde mi comprension. No aportan nada para la vista "minimalista" de CardProducts.
id, variant_id, no sabria si llegar a aportar algo por las relaciones que podemos montar, como JOINS y demas.


```JSON
"variant": {
                "id": "454729f0-c09a-4af5-a02b-3a4b4b79f03f",
                "fit": "relaxed",
                "size": "L",
                "gender": "unisex",
                "metadata": {
                    "team": "Florida Gators",
                    "color": "Orange",
                    "sport": "football"
                },
                "created_at": "2026-02-09T22:17:46.561655+00:00",
                "product_id": "37ebb784-0248-4a2c-9a55-0baf54931443",
                "main_img_url": "https://hdbhvgxogazmawphpcnj.supabase.co/storage/v1/object/public/variant-images/variants/454729f0-c09a-4af5-a02b-3a4b4b79f03f/main/main-image-1.webp",
                "main_color_hex": "#b83003",
                "main_color_category_id": "ed53a01a-46e4-466b-badd-ff3bce4a101a"
            }
```

Para variant, tenemos:
FIT, GENDER, METADATA, CREATED_AT, MAIN_COLOR_HEX, MAIN_COLOR_CATEGORY_ID --> useless. Lo relaciono como "inutil" porque simplemente estas propiedades no se usan en cada montaje de ProductCard unitario.

Las demas propiedades si se pueden visualizar, es decir, APORTAN al contexto. seria un dilema el elegir que propiedades mostrar, pero tambien es por temas de reduccion de propiedades obtenidas.

Bueno, igual entiendo que la parte de filtrados dinamicos y obtencion de los productos tras filtrados dinamicos es diferente (dado que son 2 RPC's diferentes), entonces, si remuevo algunas de las propiedades obtenidas, no interferira en seguir permitiendo un correcto filtrado por color, fit, y demas propiedades que al final no me sirven obtenerlo por esta parte, pero si poder filtrarlos.

```JSON
"product": {
                "id": "37ebb784-0248-4a2c-9a55-0baf54931443",
                "name": "Nike Florida Gators Jersey Youth M Orange NCAA Football College #1",
                "brand": "Nike",
                "is_active": true,
                "created_at": "2026-02-09T22:17:45.876211+00:00",
                "updated_at": "2026-02-09T22:17:45.876211+00:00",
                "category_id": "bd36226f-8d24-4b9c-aca2-afb8772e1990",
                "description": "The product is a Nike Florida Gators jersey in size M, designed for youth boys who support the college football team. The jersey is officially licensed and features the vibrant orange color associated with the team. Perfect for young fans looking to show their allegiance to the Florida Gators on game days or during casual wear. Made with quality materials and the signature Nike branding, this jersey is a must-have for any Gators supporter."
            },
```

Para ID, entiendo que los "useless" serian 