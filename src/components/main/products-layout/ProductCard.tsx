import Image from "next/image";
import Link from "next/link";
import { WholeProductStructure } from "@/types/products/products";
import { canOptimize, formatPrice, isCutoutUrl } from "@/lib/images/media";

interface ProductCardProps {
  product: WholeProductStructure;
  /** Overrides the link target (admin preview renders drafts that have no public page yet). */
  href?: string;
}

export const ProductCard = ({ product, href }: ProductCardProps) => {
  const src = product.variant.main_img_url || "/images/products/polo-1.png";
  const cutout = isCutoutUrl(src);

  return (
    <Link href={href ?? `/products/${product.id}`} className="product-card h-max flex flex-col gap-3 cursor-pointer">
      <div className="relative aspect-4/5 w-full overflow-hidden bg-white/90">
        <Image
          src={src}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized={!canOptimize(src)}
          className={cutout ? "object-contain p-4" : "object-cover"}
        />
      </div>

      <div className="flex flex-col gap-1 text-[#221C1C]">
        <h3 className="line-clamp-2 font-nanum text-lg leading-tight">{product.name}</h3>
        <p className="font-inria text-base">
          {formatPrice(product.item.price)}
          {product.item.compare_at_price ? (
            <span className="ml-2 text-sm text-black/40 line-through">{formatPrice(product.item.compare_at_price)}</span>
          ) : null}
        </p>
        <p className="font-inria text-sm uppercase tracking-[0.08em] text-black/60">Size {product.variant.size}</p>
      </div>
    </Link>
  );
};
