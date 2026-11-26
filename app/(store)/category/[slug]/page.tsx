import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";
import { getCategories, parseFilters } from "@/lib/catalog";

const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = decode((await params).slug);
  const cat = (await getCategories()).find((c) => c.slug === slug);
  return { title: cat?.name ?? "القسم" };
}

export default async function CategoryPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>>;
}) {
  const slug = decode((await params).slug);
  const cat = (await getCategories()).find((c) => c.slug === slug);
  if (!cat) notFound();
  const filters = { ...parseFilters(await searchParams), category: slug };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{cat.name}</h1>
      <CatalogView filters={filters} basePath={`/category/${encodeURIComponent(slug)}`} fixedCategory />
    </div>
  );
}
