import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/seo/site";

const PRIVATE_PATHS = [
  "/admin",
  "/api",
  "/cart",
  "/checkout",
  "/orders",
  "/login",
  "/register",
  "/auth",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: absoluteUrl("/sitemap.xml", siteUrl()),
  };
}
