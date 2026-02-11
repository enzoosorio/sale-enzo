/**
 * Secondary Image Position Types
 * Used for variant_images.position field
 */
export type ImagePosition = "random" | "front" | "back" | "logo_detail" | "close_detail";

/**
 * UI state for managing secondary images before upload
 */
export interface SecondaryImageUI {
  id: string; // Temporary UUID for React keys
  file: File;
  previewUrl: string; // blob URL for preview
  position: ImagePosition;
  uploadedUrl?: string; // Populated after successful upload
  isUploading?: boolean;
}

/**
 * Payload for uploading secondary image to storage
 */
export interface SecondaryImageUploadPayload {
  file: File;
  variantId: string;
  position: ImagePosition;
}

/**
 * Response after uploading secondary image
 */
export interface SecondaryImageUploadResult {
  success: boolean;
  imageId?: string;
  imageUrl?: string;
  error?: string;
}

/**
 * Database model for variant_images
 */
export interface VariantImageDB {
  id: string;
  variant_id: string;
  image_url: string;
  position: ImagePosition | null;
  created_at: string;
}

/**
 * Position labels for UI display
 */
export const POSITION_LABELS: Record<ImagePosition, string> = {
  random: "Sin posición específica",
  front: "Vista frontal",
  back: "Vista trasera",
  logo_detail: "Detalle del logo",
  close_detail: "Detalle de cerca"
};

/**
 * Position descriptions for tooltips/help text
 */
export const POSITION_DESCRIPTIONS: Record<ImagePosition, string> = {
  random: "Cualquier ángulo o detalle adicional",
  front: "Foto principal del producto de frente",
  back: "Vista posterior del producto",
  logo_detail: "Acercamiento a la marca o logo",
  close_detail: "Foto de detalle (tela, costura, etc.)"
};
