import type { MetadataRoute } from "next";
import { getSellableProducts, getSeoCategories } from "@/lib/seo/catalog";
import { buildSitemapEntries } from "@/lib/seo/sitemapEntries";
import { siteUrl } from "@/lib/seo/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([getSeoCategories(), getSellableProducts()]);
  return buildSitemapEntries(siteUrl(), categories, products);
}
