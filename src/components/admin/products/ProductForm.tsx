// "use client";

// import { useState } from "react";
// import { Plus, X, Upload, Image as ImageIcon } from "lucide-react";
// import { createProduct } from "@/actions/adminProducts";
// import { uploadMainVariantImage } from "@/utils/supabase/uploadMainImage";
// import { useRouter } from "next/navigation";
// import Image from "next/image";

// interface ProductFormData {
//   // Product table
//   name: string;
//   description: string;
//   brand: string;
//   category_id: string;
//   is_active: boolean;

//   // Variants array
//   variants: Array<{
//     size: string;
//     gender: string;
//     fit: string;
//     main_img_url: string;
//     main_img_file: File | null; // For file upload
//     main_color_hex: string;
//     metadata: Record<string, any>;
    
//     // Product Items for this variant
//     items: Array<{
//       condition: string;
//       price: string;
//       sku: string;
//       stock: string;
//       status: string;
//     }>;

//     // Images for this variant - NOT USED IN CREATION, managed separately
//     images: Array<{
//       image_url: string;
//       position: number;
//     }>;

//     // Tags for this variant
//     tag_ids: string[];
//   }>;
// }

// const initialVariant = {
//   size: "",
//   gender: "",
//   fit: "",
//   main_img_url: "",
//   main_img_file: null,
//   main_color_hex: "#000000",
//   metadata: {},
//   items: [{
//     condition: "new",
//     price: "",
//     sku: "",
//     stock: "",
//     status: "available"
//   }],
//   images: [],
//   tag_ids: []
// };

// const initialFormData: ProductFormData = {
//   name: "",
//   description: "",
//   brand: "",
//   category_id: "",
//   is_active: true,
//   variants: [{ ...initialVariant }]
// };

// export function ProductForm() {
//   const router = useRouter();
//   const [formData, setFormData] = useState<ProductFormData>(initialFormData);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [activeVariantIndex, setActiveVariantIndex] = useState(0);
//   const [error, setError] = useState<string | null>(null);
//   const [uploadingImages, setUploadingImages] = useState<Record<number, boolean>>({});

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSubmitting(true);
//     setError(null);

//     try {
//       // First, upload all main images
//       const variantsWithImages = await Promise.all(
//         formData.variants.map(async (variant, index) => {
//           if (variant.main_img_file) {
//             setUploadingImages(prev => ({ ...prev, [index]: true }));
//             const tempId = `temp-${Date.now()}-${index}`;
//             const { url, error: uploadError } = await uploadMainVariantImage(
//               variant.main_img_file,
//               tempId
//             );
//             setUploadingImages(prev => ({ ...prev, [index]: false }));

//             if (uploadError || !url) {
//               throw new Error(`Error subiendo imagen para variante ${index + 1}: ${uploadError}`);
//             }

//             return {
//               ...variant,
//               main_img_url: url,
//               main_img_file: undefined // Remove file from data
//             };
//           }

//           if (!variant.main_img_url) {
//             throw new Error(`La variante ${index + 1} requiere una imagen principal`);
//           }

//           return {
//             ...variant,
//             main_img_file: undefined
//           };
//         })
//       );

//       // Transform form data to match server action expectations
//       const transformedData = {
//         name: formData.name,
//         description: formData.description || undefined,
//         brand: formData.brand || undefined,
//         category_id: formData.category_id,
//         is_active: formData.is_active,
//         variants: variantsWithImages.map(variant => ({
//           size: variant.size || undefined,
//           gender: variant.gender || undefined,
//           fit: variant.fit || undefined,
//           main_img_url: variant.main_img_url,
//           main_color_hex: variant.main_color_hex,
//           metadata: variant.metadata,
//           items: variant.items.map(item => ({
//             condition: item.condition || undefined,
//             price: parseFloat(item.price) || 0,
//             sku: item.sku || undefined,
//             stock: parseInt(item.stock) || 0,
//             status: item.status || undefined,
//           })),
//           images: [], // Secondary images managed separately
//           tag_ids: variant.tag_ids.filter(Boolean),
//         }))
//       };

//       const result = await createProduct(transformedData);
      
//       if (!result.success) {
//         setError(result.error || "Error al crear el producto");
//         return;
//       }

//       alert("¡Producto creado exitosamente!");
//       router.push("/admin/products");
      
//     } catch (error: any) {
//       console.error("Error creating product:", error);
//       setError(error.message || "Ocurrió un error inesperado. Por favor intente nuevamente.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const addVariant = () => {
//     setFormData({
//       ...formData,
//       variants: [...formData.variants, { ...initialVariant }]
//     });
//     setActiveVariantIndex(formData.variants.length);
//   };

//   const removeVariant = (index: number) => {
//     if (formData.variants.length === 1) {
//       alert("Debe tener al menos una variante");
//       return;
//     }
    
//     const newVariants = formData.variants.filter((_, i) => i !== index);
//     setFormData({ ...formData, variants: newVariants });
    
//     if (activeVariantIndex >= newVariants.length) {
//       setActiveVariantIndex(newVariants.length - 1);
//     }
//   };

//   const updateVariant = (index: number, field: string, value: any) => {
//     const newVariants = [...formData.variants];
//     newVariants[index] = { ...newVariants[index], [field]: value };
//     setFormData({ ...formData, variants: newVariants });
//   };

//   const handleMainImageChange = (index: number, file: File | null) => {
//     if (!file) return;
    
//     const newVariants = [...formData.variants];
//     newVariants[index] = {
//       ...newVariants[index],
//       main_img_file: file,
//       main_img_url: URL.createObjectURL(file) // Preview
//     };
//     setFormData({ ...formData, variants: newVariants });
//   };

//   const removeMainImage = (index: number) => {
//     const newVariants = [...formData.variants];
//     // Revoke object URL to prevent memory leaks
//     if (newVariants[index].main_img_url.startsWith('blob:')) {
//       URL.revokeObjectURL(newVariants[index].main_img_url);
//     }
//     newVariants[index] = {
//       ...newVariants[index],
//       main_img_file: null,
//       main_img_url: ""
//     };
//     setFormData({ ...formData, variants: newVariants });
//   };

//   const addItem = (variantIndex: number) => {
//     const newVariants = [...formData.variants];
//     newVariants[variantIndex].items.push({
//       condition: "new",
//       price: "",
//       sku: "",
//       stock: "",
//       status: "available"
//     });
//     setFormData({ ...formData, variants: newVariants });
//   };

//   const removeItem = (variantIndex: number, itemIndex: number) => {
//     if (formData.variants[variantIndex].items.length === 1) {
//       alert("Cada variante debe tener al menos un item");
//       return;
//     }
    
//     const newVariants = [...formData.variants];
//     newVariants[variantIndex].items = newVariants[variantIndex].items.filter((_, i) => i !== itemIndex);
//     setFormData({ ...formData, variants: newVariants });
//   };

//   const updateItem = (variantIndex: number, itemIndex: number, field: string, value: any) => {
//     const newVariants = [...formData.variants];
//     newVariants[variantIndex].items[itemIndex] = {
//       ...newVariants[variantIndex].items[itemIndex],
//       [field]: value
//     };
//     setFormData({ ...formData, variants: newVariants });
//   };

//   // Remove image management - secondary images handled separately after product creation
//   // These functions are kept for compatibility but won't be used in the UI

//   const currentVariant = formData.variants[activeVariantIndex];

//   return (
//     <form onSubmit={handleSubmit} className="space-y-8">
//       {/* Error Message */}
//       {error && (
//         <div className="bg-red-50 border border-red-200 rounded-lg p-4">
//           <p className="text-red-800 text-sm font-medium">{error}</p>
//         </div>
//       )}

//       {/* Product Information Section */}
//       <section className="bg-white rounded-lg border border-gray-200 p-6">
//         <h2 className="text-xl font-prata font-semibold mb-4 text-gray-900">
//           Product Information
//         </h2>
        
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div className="md:col-span-2">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Product Name *
//             </label>
//             <input
//               type="text"
//               required
//               value={formData.name}
//               onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//               placeholder="e.g., Classic Cotton T-Shirt"
//             />
//           </div>

//           <div className="md:col-span-2">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Description
//             </label>
//             <textarea
//               value={formData.description}
//               onChange={(e) => setFormData({ ...formData, description: e.target.value })}
//               rows={4}
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//               placeholder="Describe your product..."
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Brand
//             </label>
//             <input
//               type="text"
//               value={formData.brand}
//               onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//               placeholder="e.g., Nike"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Category *
//             </label>
//             <input
//               type="text"
//               required
//               value={formData.category_id}
//               onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//               placeholder="Category UUID (will be dropdown in future)"
//             />
//             <p className="mt-1 text-xs text-gray-500">
//               Note: Category selection UI will be implemented in next iteration
//             </p>
//           </div>

//           <div className="flex items-center gap-3">
//             <input
//               type="checkbox"
//               id="is_active"
//               checked={formData.is_active}
//               onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
//               className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
//             />
//             <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
//               Active Product
//             </label>
//           </div>
//         </div>
//       </section>

//       {/* Variants Section */}
//       <section className="bg-white rounded-lg border border-gray-200 p-6">
//         <div className="flex items-center justify-between mb-6">
//           <h2 className="text-xl font-prata font-semibold text-gray-900">
//             Variants
//           </h2>
//           <button
//             type="button"
//             onClick={addVariant}
//             className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
//           >
//             <Plus className="w-4 h-4" />
//             Add Variant
//           </button>
//         </div>

//         {/* Variant Tabs */}
//         <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
//           {formData.variants.map((variant, index) => (
//             <div key={index} className="flex items-center gap-1">
//               <button
//                 type="button"
//                 onClick={() => setActiveVariantIndex(index)}
//                 className={`
//                   px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
//                   ${activeVariantIndex === index
//                     ? 'bg-gray-900 text-white'
//                     : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                   }
//                 `}
//               >
//                 Variant {index + 1}
//                 {variant.size && ` (${variant.size})`}
//               </button>
//               {formData.variants.length > 1 && (
//                 <button
//                   type="button"
//                   onClick={() => removeVariant(index)}
//                   className="p-1 text-gray-400 hover:text-red-600 transition-colors"
//                   title="Remove variant"
//                 >
//                   <X className="w-4 h-4" />
//                 </button>
//               )}
//             </div>
//           ))}
//         </div>

//         {/* Active Variant Form */}
//         <div className="space-y-6 border-t border-gray-200 pt-6">
//           <h3 className="font-medium text-gray-900">Variant Details</h3>
          
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Size
//               </label>
//               <input
//                 type="text"
//                 value={currentVariant.size}
//                 onChange={(e) => updateVariant(activeVariantIndex, 'size', e.target.value)}
//                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//                 placeholder="e.g., M, L, XL"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Gender
//               </label>
//               <select
//                 value={currentVariant.gender}
//                 onChange={(e) => updateVariant(activeVariantIndex, 'gender', e.target.value)}
//                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//               >
//                 <option value="">Select gender</option>
//                 <option value="male">Male</option>
//                 <option value="female">Female</option>
//                 <option value="unisex">Unisex</option>
//               </select>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Fit
//               </label>
//               <select
//                 value={currentVariant.fit}
//                 onChange={(e) => updateVariant(activeVariantIndex, 'fit', e.target.value)}
//                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//               >
//                 <option value="">Select fit</option>
//                 <option value="regular">Regular</option>
//                 <option value="slim">Slim</option>
//                 <option value="relaxed">Relaxed</option>
//                 <option value="oversized">Oversized</option>
//               </select>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Main Color (Hex)
//               </label>
//               <div className="flex gap-2">
//                 <input
//                   type="color"
//                   value={currentVariant.main_color_hex}
//                   onChange={(e) => updateVariant(activeVariantIndex, 'main_color_hex', e.target.value)}
//                   className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
//                 />
//                 <input
//                   type="text"
//                   value={currentVariant.main_color_hex}
//                   onChange={(e) => updateVariant(activeVariantIndex, 'main_color_hex', e.target.value)}
//                   className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//                   placeholder="#000000"
//                 />
//               </div>
//             </div>

//             <div className="md:col-span-2">
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Main Image URL *
//               </label>
//               <input
//                 type="url"
//                 required
//                 value={currentVariant.main_img_url}
//                 onChange={(e) => updateVariant(activeVariantIndex, 'main_img_url', e.target.value)}
//                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//                 placeholder="https://example.com/image.jpg"
//               />
//             </div>
//           </div>

//           {/* Product Items (Inventory) */}
//           <div className="border-t border-gray-200 pt-6">
//             <div className="flex items-center justify-between mb-4">
//               <h4 className="font-medium text-gray-900">Inventory Items</h4>
//               <button
//                 type="button"
//                 onClick={() => addItem(activeVariantIndex)}
//                 className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
//               >
//                 <Plus className="w-3 h-3" />
//                 Add Item
//               </button>
//             </div>

//             {currentVariant.items.map((item, itemIndex) => (
//               <div key={itemIndex} className="p-4 bg-gray-50 rounded-lg mb-3">
//                 <div className="flex items-center justify-between mb-3">
//                   <span className="text-sm font-medium text-gray-700">
//                     Item {itemIndex + 1}
//                   </span>
//                   {currentVariant.items.length > 1 && (
//                     <button
//                       type="button"
//                       onClick={() => removeItem(activeVariantIndex, itemIndex)}
//                       className="text-red-600 hover:text-red-700 text-sm"
//                     >
//                       Remove
//                     </button>
//                   )}
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
//                   <div>
//                     <label className="block text-xs font-medium text-gray-600 mb-1">
//                       Condition
//                     </label>
//                     <select
//                       value={item.condition}
//                       onChange={(e) => updateItem(activeVariantIndex, itemIndex, 'condition', e.target.value)}
//                       className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//                     >
//                       <option value="new">New</option>
//                       <option value="used">Used</option>
//                       <option value="refurbished">Refurbished</option>
//                     </select>
//                   </div>

//                   <div>
//                     <label className="block text-xs font-medium text-gray-600 mb-1">
//                       Price *
//                     </label>
//                     <input
//                       type="number"
//                       step="0.01"
//                       required
//                       value={item.price}
//                       onChange={(e) => updateItem(activeVariantIndex, itemIndex, 'price', e.target.value)}
//                       className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//                       placeholder="0.00"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-xs font-medium text-gray-600 mb-1">
//                       SKU
//                     </label>
//                     <input
//                       type="text"
//                       value={item.sku}
//                       onChange={(e) => updateItem(activeVariantIndex, itemIndex, 'sku', e.target.value)}
//                       className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//                       placeholder="SKU-123"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-xs font-medium text-gray-600 mb-1">
//                       Stock
//                     </label>
//                     <input
//                       type="number"
//                       value={item.stock}
//                       onChange={(e) => updateItem(activeVariantIndex, itemIndex, 'stock', e.target.value)}
//                       className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//                       placeholder="0"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-xs font-medium text-gray-600 mb-1">
//                       Status
//                     </label>
//                     <select
//                       value={item.status}
//                       onChange={(e) => updateItem(activeVariantIndex, itemIndex, 'status', e.target.value)}
//                       className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//                     >
//                       <option value="available">Available</option>
//                       <option value="sold">Sold</option>
//                       <option value="reserved">Reserved</option>
//                     </select>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Additional Images */}
//           <div className="border-t border-gray-200 pt-6">
//             <div className="flex items-center justify-between mb-4">
//               <h4 className="font-medium text-gray-900">Additional Images</h4>
//               <button
//                 type="button"
//                 onClick={() => addImage(activeVariantIndex)}
//                 className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
//               >
//                 <Plus className="w-3 h-3" />
//                 Add Image
//               </button>
//             </div>

//             {currentVariant.images.length === 0 ? (
//               <p className="text-sm text-gray-500 italic">No additional images yet</p>
//             ) : (
//               <div className="space-y-2">
//                 {currentVariant.images.map((image, imageIndex) => (
//                   <div key={imageIndex} className="flex gap-2 items-center">
//                     <span className="text-xs font-medium text-gray-500 w-8">
//                       {imageIndex + 1}
//                     </span>
//                     <input
//                       type="url"
//                       value={image.image_url}
//                       onChange={(e) => updateImage(activeVariantIndex, imageIndex, e.target.value)}
//                       className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//                       placeholder="https://example.com/image.jpg"
//                     />
//                     <button
//                       type="button"
//                       onClick={() => removeImage(activeVariantIndex, imageIndex)}
//                       className="p-1.5 text-red-600 hover:text-red-700"
//                     >
//                       <X className="w-4 h-4" />
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Tags */}
//           <div className="border-t border-gray-200 pt-6">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Tags (UUIDs, comma-separated)
//             </label>
//             <input
//               type="text"
//               value={currentVariant.tag_ids.join(', ')}
//               onChange={(e) => updateVariant(
//                 activeVariantIndex, 
//                 'tag_ids', 
//                 e.target.value.split(',').map(id => id.trim()).filter(Boolean)
//               )}
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
//               placeholder="uuid-1, uuid-2, uuid-3"
//             />
//             <p className="mt-1 text-xs text-gray-500">
//               Note: Tag selector UI will be implemented in next iteration
//             </p>
//           </div>
//         </div>
//       </section>

//       {/* Form Actions */}
//       <div className="flex items-center justify-end gap-4 bg-white rounded-lg border border-gray-200 p-6">
//         <button
//           type="button"
//           onClick={() => {
//             if (confirm("Are you sure? All changes will be lost.")) {
//               setFormData(initialFormData);
//             }
//           }}
//           className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
//         >
//           Reset
//         </button>
//         <button
//           type="submit"
//           disabled={isSubmitting}
//           className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
//         >
//           {isSubmitting ? "Creating..." : "Create Product"}
//         </button>
//       </div>
//     </form>
//   );
// }
