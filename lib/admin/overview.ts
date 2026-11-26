import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

interface VariantRow {
  stock_quantity: number;
  low_stock_threshold: number;
  product_costs: { purchase_cost: number } | { purchase_cost: number }[] | null;
  products: {
    retail_price: number;
    wholesale_price: number;
    categories: { name: string } | null;
  } | null;
}

const num = (v: unknown) => Number(v ?? 0);
const costOf = (c: VariantRow["product_costs"]) => num(Array.isArray(c) ? c[0]?.purchase_cost : c?.purchase_cost);

export interface Overview {
  productCount: number;
  categoryCount: number;
  costValue: number;
  retailValue: number;
  wholesaleValue: number;
  expectedRetailProfit: number;
  expectedWholesaleProfit: number;
  lowStock: number;
  outOfStock: number;
  byCategory: { name: string; cost: number; retail: number }[];
  recentProducts: { id: string; name: string; brand: string | null; created_at: string }[];
  recentPriceChanges: {
    id: string; field: string; old_value: number | null; new_value: number | null;
    changed_at: string; products: { name: string } | null;
  }[];
}

export async function getOverview(supabase: SupabaseClient): Promise<Overview> {
  const [products, categories, variants, recent, prices] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase
      .from("product_variants")
      .select("stock_quantity, low_stock_threshold, product_costs(purchase_cost), products(retail_price, wholesale_price, categories(name))")
      .eq("is_active", true),
    supabase.from("products").select("id, name, brand, created_at").order("created_at", { ascending: false }).limit(5),
    supabase
      .from("price_history")
      .select("id, field, old_value, new_value, changed_at, products(name)")
      .in("field", ["retail_price", "wholesale_price"])
      .order("changed_at", { ascending: false })
      .limit(5),
  ]);

  for (const r of [products, categories, variants, recent, prices]) if (r.error) throw new Error(r.error.message);

  let costValue = 0, retailValue = 0, wholesaleValue = 0, lowStock = 0, outOfStock = 0;
  const cat = new Map<string, { cost: number; retail: number }>();

  for (const v of (variants.data ?? []) as unknown as VariantRow[]) {
    const qty = num(v.stock_quantity);
    const cost = costOf(v.product_costs) * qty;
    const retail = num(v.products?.retail_price) * qty;
    costValue += cost;
    retailValue += retail;
    wholesaleValue += num(v.products?.wholesale_price) * qty;
    if (qty === 0) outOfStock++;
    else if (qty <= num(v.low_stock_threshold)) lowStock++;

    const name = v.products?.categories?.name ?? "بدون فئة";
    const cur = cat.get(name) ?? { cost: 0, retail: 0 };
    cat.set(name, { cost: cur.cost + cost, retail: cur.retail + retail });
  }

  return {
    productCount: products.count ?? 0,
    categoryCount: categories.count ?? 0,
    costValue,
    retailValue,
    wholesaleValue,
    expectedRetailProfit: retailValue - costValue,
    expectedWholesaleProfit: wholesaleValue - costValue,
    lowStock,
    outOfStock,
    byCategory: [...cat.entries()].map(([name, v]) => ({ name, ...v })),
    recentProducts: (recent.data ?? []) as Overview["recentProducts"],
    recentPriceChanges: (prices.data ?? []) as unknown as Overview["recentPriceChanges"],
  };
}
