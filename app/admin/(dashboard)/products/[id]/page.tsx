import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImages } from "@/components/admin/product-images";
import { PricingTiers } from "@/components/admin/pricing-tiers";
import { requireAdmin } from "@/lib/supabase/server";

export const metadata = { title: "تعديل منتج" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const admin = await requireAdmin();
  if (!admin) return null;

  const [{ data: p }, { data: cats }, { data: images }, { data: rules }] = await Promise.all([
    admin.supabase
      .from("products")
      .select("*, product_variants(*, product_costs(purchase_cost))")
      .eq("id", id)
      .single(),
    admin.supabase.from("categories").select("id, name, parent_id").order("sort_order"),
    admin.supabase.from("product_images").select("id, path, is_primary").eq("product_id", id).order("sort_order"),
    admin.supabase.from("pricing_rules").select("customer_type, min_qty, max_qty, discount_type, value").eq("product_id", id).order("min_qty"),
  ]);
  if (!p) notFound();

  const variants = [...(p.product_variants ?? [])]
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((v: any) => {
      const c = Array.isArray(v.product_costs) ? v.product_costs[0] : v.product_costs;
      return {
        id: v.id, color: v.color ?? "", storage: v.storage ?? "", ram: v.ram ?? "", sku: v.sku ?? "", barcode: v.barcode ?? "",
        purchase_cost: Number(c?.purchase_cost ?? 0), stock_quantity: v.stock_quantity, low_stock_threshold: v.low_stock_threshold,
      };
    });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">تعديل: {p.name}</h1>
      <ProductForm
        key={p.updated_at}
        categories={cats ?? []}
        defaultValues={{
          id: p.id, name: p.name, brand: p.brand ?? "", model: p.model ?? "", category_id: p.category_id ?? "",
          condition: p.condition, description: p.description ?? "",
          retail_price: Number(p.retail_price), wholesale_price: Number(p.wholesale_price),
          is_active: p.is_active, is_featured: p.is_featured, is_offer: p.is_offer,
          specs: Object.entries((p.specs ?? {}) as Record<string, string>).map(([key, value]) => ({ key, value: String(value) })),
          variants: variants.length ? variants : [{ id: "", color: "", storage: "", ram: "", sku: "", barcode: "", purchase_cost: 0, stock_quantity: 0, low_stock_threshold: 3 }],
        }}
      />
      <ProductImages productId={p.id} images={images ?? []} />
      <PricingTiers
        key={`${p.updated_at}-${(rules ?? []).length}`}
        productId={p.id}
        retailPrice={Number(p.retail_price)}
        wholesalePrice={Number(p.wholesale_price)}
        initial={(rules ?? []).map((r: any) => ({ ...r, value: Number(r.value) }))}
      />
    </div>
  );
}
