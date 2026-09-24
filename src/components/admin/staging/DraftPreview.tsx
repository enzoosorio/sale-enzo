"use client";

import { ProductCard } from "@/components/main/products-layout/ProductCard";
import { ProductDetailView } from "@/components/products/ProductDetailView";
import { mediaUrl } from "@/lib/images/media";
import { draftToCard, draftToDetail } from "@/lib/staging/draftToPreview";
import type { DraftWithImages } from "@/types/staging";

/** Renders the draft with the real storefront components: grid card + detail page. */
export function DraftPreview({ draft }: { draft: DraftWithImages }) {
  const card = draftToCard(draft, draft.images, mediaUrl);
  const detail = draftToDetail(draft, draft.images, mediaUrl);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">En el grid de /products</h3>
        <div className="w-56 bg-off-white p-4 rounded-lg">
          <ProductCard product={card} href="#" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Página de detalle</h3>
        <div className="rounded-lg overflow-hidden border border-gray-200">
          <ProductDetailView product={detail} preview />
        </div>
      </div>
    </div>
  );
}
