# Zod Schema Quick Reference

## Import Schemas

```typescript
import {
  // User schemas
  userSchema,
  userInsertSchema,
  userUpdateSchema,
  userRegistrationSchema,
  
  // Product schemas
  productSchema,
  productInsertSchema,
  productVariantSchema,
  productVariantInsertSchema,
  productItemSchema,
  productItemInsertSchema,
  
  // Category & Tags
  productCategorySchema,
  tagSchema,
  variantTagInsertSchema,
  
  // Colors
  variantColorSchema,
  variantColorCategorySchema,
  
  // Orders & Cart
  orderSchema,
  orderInsertSchema,
  orderItemInsertSchema,
  cartItemInsertSchema,
  
  // Types
  User,
  Product,
  ProductVariant,
  ProductItem,
  Order
} from '@/schema';
```

## Common Validation Patterns

### User Registration
```typescript
const formData = {
  email: "user@example.com",
  first_name: "John",
  last_name: "Doe",
  password: "SecureP@ss123",
  confirmPassword: "SecureP@ss123"
};

const result = userRegistrationSchema.safeParse(formData);
if (!result.success) {
  console.error(result.error.flatten());
}
```

### Create Product Flow
```typescript
// 1. Create product
const product = await productInsertSchema.parseAsync({
  name: "Classic T-Shirt",
  brand: "MyBrand",
  description: "Comfortable cotton t-shirt",
  category_id: categoryId,
  is_active: true
});

// 2. Create variant(s)
const variant = await productVariantInsertSchema.parseAsync({
  product_id: product.id,
  size: "M",
  main_color_hex: "#FF0000",
  main_img_url: "https://example.com/image.jpg",
  gender: "unisex",
  fit: "regular"
});

// 3. Create sellable item(s)
const item = await productItemInsertSchema.parseAsync({
  variant_id: variant.id,
  condition: "new",
  price: 29.99,
  stock: 100,
  sku: "TSHIRT-RED-M-001",
  status: "active"
});
```

### Add to Cart
```typescript
const cartItem = await cartItemInsertSchema.parseAsync({
  user_id: userId,
  variant_id: variantId,
  quantity: 2
});
```

### Create Order
```typescript
const order = await orderInsertSchema.parseAsync({
  user_id: userId,
  total: 99.99,
  shipping_address: {
    street: "123 Main St",
    city: "New York",
    state: "NY",
    postal_code: "10001",
    country: "USA"
  },
  billing_address: { /* same structure */ },
  status: "pending",
  payment_status: "pending",
  payment_provider_id: providerId
});

// Add order items
const orderItem = await orderItemInsertSchema.parseAsync({
  order_id: order.id,
  variant_id: variantId,
  price: 29.99,
  quantity: 2
});
```

### Track User Interaction
```typescript
const interaction = await userInteractionInsertSchema.parseAsync({
  user_id: userId, // optional for anonymous
  product_id: productId,
  variant_id: variantId,
  interaction_type: "view",
  metadata: { source: "search" }
});
```

### Add Colors to Variant
```typescript
const color = await variantColorInsertSchema.parseAsync({
  variant_id: variantId,
  color_category_id: colorCategoryId,
  original_hex: "#FF5733",
  l: 62.5,  // 0-100
  a: 45.2,  // -128 to 127
  b: 38.1   // -128 to 127
});
```

## Validation Helpers

### Safe Parse (Recommended)
```typescript
const result = schema.safeParse(data);
if (result.success) {
  // result.data is typed and validated
  handleSuccess(result.data);
} else {
  // result.error contains validation errors
  handleError(result.error);
}
```

### Parse (Throws on Error)
```typescript
try {
  const validated = schema.parse(data);
  handleSuccess(validated);
} catch (error) {
  if (error instanceof z.ZodError) {
    handleError(error);
  }
}
```

### Async Parse
```typescript
const validated = await schema.parseAsync(data);
```

## Error Handling

### Flatten Errors for Forms
```typescript
const result = schema.safeParse(formData);
if (!result.success) {
  const errors = result.error.flatten();
  // errors.fieldErrors gives field-level errors
  // { email: ["Invalid email"], password: ["Too short"] }
}
```

### Custom Error Messages
```typescript
const result = schema.safeParse(data);
if (!result.success) {
  const errors = result.error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message
  }));
}
```

## Partial Validation

### Update Schemas (Already Partial)
```typescript
// Update only specific fields
const update = userUpdateSchema.parse({
  first_name: "Jane"
  // other fields optional
});
```

### Make Any Schema Partial
```typescript
const partialProduct = productInsertSchema.partial();
```

## Type Inference

```typescript
// Infer TypeScript types from schemas
type User = z.infer<typeof userSchema>;
type ProductInsert = z.infer<typeof productInsertSchema>;

// Use in functions
function createUser(data: z.infer<typeof userInsertSchema>) {
  // data is fully typed
}
```

## Enums

### Product Condition
```typescript
import { productConditionEnum } from '@/schema';

// Values: 'new', 'like_new', 'semi-used', 'used', 'worn'
const condition: z.infer<typeof productConditionEnum> = 'new';
```

### Product Item Status
```typescript
import { productItemStatusEnum } from '@/schema';

// Values: 'active', 'hidden', 'sold'
const status: z.infer<typeof productItemStatusEnum> = 'active';
```

### Order Status
```typescript
import { orderStatusEnum } from '@/schema';

// Values: 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
```

### Interaction Type
```typescript
import { interactionTypeEnum } from '@/schema';

// Values: 'view', 'click', 'add_to_cart', etc.
```

## Common Patterns

### Nested Object Validation
```typescript
const orderWithItems = z.object({
  order: orderInsertSchema,
  items: z.array(orderItemInsertSchema).min(1)
});
```

### Transform Data
```typescript
const schema = userInsertSchema.transform(data => ({
  ...data,
  email: data.email.toLowerCase()
}));
```

### Refine with Custom Logic
```typescript
const schema = orderInsertSchema.refine(
  data => data.total > 0,
  { message: "Total must be greater than 0" }
);
```

## Server Actions Example

```typescript
'use server';

import { productInsertSchema } from '@/schema';

export async function createProduct(formData: FormData) {
  const rawData = {
    name: formData.get('name'),
    brand: formData.get('brand'),
    description: formData.get('description'),
    category_id: formData.get('category_id'),
  };

  // Validate
  const result = productInsertSchema.safeParse(rawData);
  
  if (!result.success) {
    return {
      error: result.error.flatten().fieldErrors
    };
  }

  // Insert validated data
  const product = await db.insert(result.data);
  
  return { success: true, data: product };
}
```

## API Route Example

```typescript
import { NextResponse } from 'next/server';
import { productInsertSchema } from '@/schema';

export async function POST(request: Request) {
  const body = await request.json();
  
  const result = productInsertSchema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten() },
      { status: 400 }
    );
  }
  
  const product = await createProduct(result.data);
  
  return NextResponse.json(product);
}
```

## Form Validation with React Hook Form

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { userRegistrationSchema } from '@/schema';

function RegistrationForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(userRegistrationSchema)
  });

  const onSubmit = (data) => {
    // data is validated and typed
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      
      <input {...register('first_name')} />
      <input {...register('last_name')} />
      <input type="password" {...register('password')} />
      <input type="password" {...register('confirmPassword')} />
      
      <button type="submit">Register</button>
    </form>
  );
}
```
