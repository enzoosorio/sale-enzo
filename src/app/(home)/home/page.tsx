import type { Metadata } from 'next';
import { OverviewProductsHero } from '@/components/main/OverviewProductsHero';
import { products } from '@/lib/products';
import { BASE_OPEN_GRAPH, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/site';

const title = `${SITE_NAME}: ${SITE_TAGLINE.toLowerCase()} en Lima`;

export const metadata: Metadata = {
  // Absolute: the brand already leads, so the root template must not append it again.
  title: { absolute: title },
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: '/home' },
  openGraph: { ...BASE_OPEN_GRAPH, title, description: DEFAULT_DESCRIPTION, url: '/home', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title, description: DEFAULT_DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
};


export default function Home() {
  return (
    <main className="main-home relative z-0">
      {/* Reserves the hero room where the header's search bar rests before it docks (HomeSearchDock). */}
      <div aria-hidden="true" className="h-(--dock-space)" />
      <OverviewProductsHero products={products} />
    </main>
  );
}
