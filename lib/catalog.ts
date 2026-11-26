import "server-only";
import { unstable_cache } from "next/cache";
import { publicDb } from "@/lib/supabase/public";
import type { PricingRule } from "@/lib/pricing/engine";

export const PAGE_SIZE = 12;
const CACHE = { tags: ["catalog"], revalidate: 300 };

export interface StoreSettings {
  store_name: string; logo_path: string | null; description: string | null; phone: string | null;
  whatsapp: string | null; address: string | null; facebook_url: string | null; instagram_url: string | null; currency: string;
}
export interface Category { id: string; name: string; slug: string; parent_id: string | null }
export interface ProductItem {
  id: string; slug: string; name: string; brand: string | null; model: string | null; description: string | null;
  specs: Record<string, string>; condition: string; retail_price: number; wholesale_price: number;
  is_featured: boolean; is_offer: boolean; in_stock: boolean; image_path: string | null; colors: string[] | null;
  category_name: string | null; created_at: string;
}
export interface Filters {
  q?: string; category?: string; brand?: string; min?: number; max?: number; inStock?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "name"; page?: number;
}

const LIST_COLS =
  "id, slug, name, brand, model, description, specs, condition, retail_price, wholesale_price, is_featured, is_offer, in_stock, image_path, colors, category_name, created_at";

const defaults: StoreSettings = {
  store_name: "متجر الموبايلات", logo_path: null, description: null, phone: null, whatsapp: null,
  address: null, facebook_url: null, instagram_url: null, currency: "EGP",
};

const toItem = (r: any): ProductItem => ({ ...r, retail_price: Number(r.retail_price), wholesale_price: Number(r.wholesale_price), specs: r.specs ?? {} });
const SLUG = /^[\p{L}\p{N}-]+$/u;

export const getSettings = unstable_cache(async (): Promise<StoreSettings> => {
  const { data } = await publicDb().from("store_settings").select("*").maybeSingle();
  return { ...defaults, ...(data ?? {}) };
}, ["store-settings"], CACHE);

export const getCategories = unstable_cache(async (): Promise<Category[]> => {
  const { data } = await publicDb().from("categories").select("id, name, slug, parent_id").order("sort_order");
  return data ?? [];
}, ["categories"], CACHE);

export const getBrands = unstable_cache(async (): Promise<string[]> => {
  const { data } = await publicDb().from("public_products").select("brand").not("brand", "is", null);
  return [...new Set((data ?? []).map((r: any) => r.brand as string))].sort();
}, ["brands"], CACHE);

export const getHome = unstable_cache(async () => {
  const db = publicDb();
  const [featured, latest, offers] = await Promise.all([
    db.from("public_products").select(LIST_COLS).eq("is_featured", true).order("created_at", { ascending: false }).limit(8),
    db.from("public_products").select(LIST_COLS).order("created_at", { ascending: false }).limit(8),
    db.from("public_products").select(LIST_COLS).eq("is_offer", true).order("created_at", { ascending: false }).limit(8),
  ]);
  return { featured: (featured.data ?? []).map(toItem), latest: (latest.data ?? []).map(toItem), offers: (offers.data ?? []).map(toItem) };
}, ["home"], CACHE);

async function listRaw(f: Filters) {
  let q = publicDb().from("public_products").select(LIST_COLS, { count: "exact" });
  const terms = (f.q ?? "").replace(/[%,()*\\]/g, " ").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  for (const t of terms) q = q.ilike("search_text", `%${t}%`);
  if (f.category && SLUG.test(f.category)) q = q.or(`category_slug.eq.${f.category},parent_slug.eq.${f.category}`);
  if (f.brand) q = q.eq("brand", f.brand);
  if (f.min != null) q = q.gte("retail_price", f.min);
  if (f.max != null) q = q.lte("retail_price", f.max);
  if (f.inStock) q = q.eq("in_stock", true);
  switch (f.sort) {
    case "price_asc": q = q.order("retail_price", { ascending: true }); break;
    case "price_desc": q = q.order("retail_price", { ascending: false }); break;
    case "name": q = q.order("name", { ascending: true }); break;
    default: q = q.order("created_at", { ascending: false });
  }
  const page = Math.max(1, f.page ?? 1);
  const { data, count, error } = await q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  return { items: (data ?? []).map(toItem), total: count ?? 0 };
}
const listCached = unstable_cache(listRaw, ["list"], CACHE);

/** Free-text / price-range queries are not cached (unbounded keys); common listings are. */
export function listProducts(f: Filters) {
  return f.q || f.min != null || f.max != null ? listRaw(f) : listCached(f);
}

export function parseFilters(sp: Record<string, string | undefined>): Filters {
  const num = (v?: string) => (v && v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : undefined);
  const sorts = ["newest", "price_asc", "price_desc", "name"] as const;
  return {
    q: sp.q?.trim().slice(0, 80) || undefined,
    category: sp.category || undefined,
    brand: sp.brand || undefined,
    min: num(sp.min), max: num(sp.max),
    inStock: sp.stock === "1",
    sort: (sorts as readonly string[]).includes(sp.sort ?? "") ? (sp.sort as Filters["sort"]) : "newest",
    page: Math.max(1, Math.floor(Number(sp.page)) || 1),
  };
}

export async function getProduct(slug: string) {
  const db = publicDb();
  const { data: p } = await db.from("public_products").select("*").eq("slug", slug).maybeSingle();
  if (!p) return null;
  const [imgs, vars, rules] = await Promise.all([
    db.from("product_images").select("path").eq("product_id", p.id).order("is_primary", { ascending: false }).order("sort_order"),
    db.from("public_variants").select("id, color, storage, ram, in_stock, low_stock").eq("product_id", p.id).order("sort_order"),
    db.from("pricing_rules").select("customer_type, min_qty, max_qty, discount_type, value").eq("product_id", p.id).order("min_qty"),
  ]);
  return {
    product: toItem(p),
    images: (imgs.data ?? []).map((i: any) => i.path as string),
    variants: (vars.data ?? []) as { id: string; color: string | null; storage: string | null; ram: string | null; in_stock: boolean; low_stock: boolean }[],
    rules: (rules.data ?? []).map((r: any): PricingRule => ({
      customerType: r.customer_type, minQty: r.min_qty, maxQty: r.max_qty, discountType: r.discount_type, value: Number(r.value),
    })),
  };
}

export async function getAllSlugs(): Promise<{ slug: string; created_at: string }[]> {
  const { data } = await publicDb().from("public_products").select("slug, created_at");
  return data ?? [];
}
