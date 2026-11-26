import { CatalogView } from "@/components/store/catalog-view";
import { parseFilters } from "@/lib/catalog";

export const metadata = { title: "كل المنتجات" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = parseFilters(await searchParams);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">المنتجات</h1>
      <CatalogView filters={filters} basePath="/products" />
    </div>
  );
}
