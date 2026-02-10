"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteVariant } from "@/actions/admin/variant";
interface DeleteVariantButtonProps {
  variantId: string;
  productName: string;
}

/**
 * DeleteVariantButton Component
 * 
 * Client component for deleting a variant with confirmation
 */
export function DeleteVariantButton({ variantId, productName }: DeleteVariantButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const result = await deleteVariant(variantId);
      
      if (result.success) {
        router.push("/admin/products");
        router.refresh();
      } else {
        alert(`Error: ${result.error}`);
        setIsDeleting(false);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("An unexpected error occurred");
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Delete Variant?
          </h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this variant of <strong>{productName}</strong>? 
            This will also delete all associated items, images, and tags. This action cannot be undone.
          </p>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
    >
      <Trash2 className="w-5 h-5" />
      <span className="font-medium">Delete</span>
    </button>
  );
}
