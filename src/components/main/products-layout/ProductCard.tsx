import { WholeProductStructure } from "@/types/products/products";
import Link from "next/link";

interface ProductCardProps {
  product: WholeProductStructure;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <Link  href={`/products/${product.id}`} className="product-card h-max flex flex-col gap-3 cursor-pointer">
      <div className="overflow-hidden bg-white/90">
        <img
          src={product.variant.main_img_url || "/images/products/polo-1.png"}
          alt={product.name}
          className="aspect-4/5 w-full object-cover"
        />
      </div>

      <div className="flex flex-col gap-1 text-[#221C1C]">
        <h3 className="line-clamp-2 font-nanum text-lg leading-tight">{product.name}</h3>
        <p className="font-inria text-base">${product.item.price.toFixed(2)}</p>
        <p className="font-inria text-sm uppercase tracking-[0.08em] text-black/60">Size {product.variant.size}</p>
      </div>
    </Link>
  );
};
