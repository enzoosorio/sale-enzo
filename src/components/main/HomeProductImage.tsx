'use client';

import Image from 'next/image';
import { useState } from 'react';
import { canOptimize, isCutoutUrl } from '@/lib/images/media';

interface HomeProductImageProps {
  src: string | null;
  alt: string;
  /** Grid position: the first row is above the fold, so it loads eagerly. */
  index: number;
}

const EAGER_COUNT = 8;

/** Remote catalog photos can disappear (e.g. a removed stock photo); fall back to a quiet placeholder. */
export const HomeProductImage = ({ src, alt, index }: HomeProductImageProps) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className="absolute inset-0 flex items-center justify-center font-inria text-xs uppercase tracking-[0.08em] text-black/40">
        Sin foto
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
      unoptimized={!canOptimize(src)}
      preload={index === 0}
      loading={index === 0 ? undefined : index < EAGER_COUNT ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className={`${isCutoutUrl(src) ? 'object-contain p-3' : 'object-cover'} transition-transform duration-300 ease-out group-hover:scale-[1.03]`}
    />
  );
};
