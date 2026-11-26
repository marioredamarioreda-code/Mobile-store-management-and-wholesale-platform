import type { MetadataRoute } from "next";
import { getAllSlugs } from "@/lib/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const products = await getAllSlugs().catch(() => []);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    ...products.map((p) => ({ url: `${base}/products/${encodeURIComponent(p.slug)}`, lastModified: new Date(p.created_at), priority: 0.7 })),
  ];
}
