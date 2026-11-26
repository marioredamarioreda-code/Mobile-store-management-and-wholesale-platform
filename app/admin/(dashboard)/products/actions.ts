"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validation/product";
import { makeSlug } from "@/lib/slug";
import { dbError } from "@/lib/db-error";

function refresh() {
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidateTag("catalog");
}

export async function saveProduct(input: unknown): Promise<{ error: string } | { ok: true; id: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "غير مصرح" };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const p = parsed.data;
  const sb = admin.supabase;

  const row = {
    name: p.name,
    brand: p.brand || null,
    model: p.model || null,
    category_id: p.category_id || null,
    condition: p.condition,
    description: p.description || null,
    specs: Object.fromEntries(p.specs.filter((s) => s.key).map((s) => [s.key, s.value])),
    retail_price: p.retail_price,
    wholesale_price: p.wholesale_price,
    is_active: p.is_active,
    is_featured: p.is_featured,
    is_offer: p.is_offer,
  };

  // 1) product row
  let productId = p.id;
  if (productId) {
    const { error } = await sb.from("products").update(row).eq("id", productId);
    if (error) return { error: dbError(error) };
  } else {
    const { data, error } = await sb.from("products").insert({ ...row, slug: makeSlug(p.name) }).select("id").single();
    if (error || !data) return { error: dbError(error ?? { message: "تعذّر إنشاء المنتج" }) };
    productId = data.id as string;
  }

  // 2) variants: delete removed, update existing, insert new
  const { data: existing, error: exErr } = await sb
    .from("product_variants").select("id, stock_quantity").eq("product_id", productId);
  if (exErr) return { error: dbError(exErr) };
  const current = new Map<string, number>((existing ?? []).map((v: any) => [v.id, v.stock_quantity]));
  const keep = new Set(p.variants.map((v) => v.id).filter(Boolean) as string[]);
  const removed = [...current.keys()].filter((id) => !keep.has(id));
  if (removed.length) {
    const { error } = await sb.from("product_variants").delete().in("id", removed).eq("product_id", productId);
    if (error) return { error: dbError(error) };
  }

  for (const [i, v] of p.variants.entries()) {
    const vrow = {
      product_id: productId,
      color: v.color || null,
      storage: v.storage || null,
      ram: v.ram || null,
      sku: v.sku || null,
      barcode: v.barcode || null,
      low_stock_threshold: v.low_stock_threshold,
      sort_order: i,
    };
    let variantId = v.id && current.has(v.id) ? v.id : undefined;
    let delta: number;
    let type: "adjustment" | "purchase";

    if (variantId) {
      const { error } = await sb.from("product_variants").update(vrow).eq("id", variantId).eq("product_id", productId);
      if (error) return { error: dbError(error) };
      delta = v.stock_quantity - (current.get(variantId) ?? 0);
      type = "adjustment";
    } else {
      const { data, error } = await sb.from("product_variants").insert({ ...vrow, stock_quantity: 0 }).select("id").single();
      if (error || !data) return { error: dbError(error ?? { message: "تعذّر إنشاء النسخة" }) };
      variantId = data.id as string;
      delta = v.stock_quantity;
      type = "purchase";
    }

    const { error: costErr } = await sb.from("product_costs").upsert({ variant_id: variantId, purchase_cost: v.purchase_cost });
    if (costErr) return { error: dbError(costErr) };

    if (delta !== 0) {
      const { error } = await sb.from("inventory_movements").insert({
        variant_id: variantId, type, quantity: delta, created_by: admin.user.id,
        note: type === "purchase" ? "رصيد افتتاحي" : "تعديل يدوي من صفحة المنتج",
      });
      if (error) return { error: dbError(error) };
    }
  }

  refresh();
  return { ok: true, id: productId };
}

export async function toggleProductActive(id: string, value: boolean) {
  const admin = await requireAdmin();
  if (!admin) return;
  await admin.supabase.from("products").update({ is_active: value }).eq("id", id);
  refresh();
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "غير مصرح" };
  const { data: imgs } = await admin.supabase.from("product_images").select("path").eq("product_id", id);
  const { error } = await admin.supabase.from("products").delete().eq("id", id);
  if (error) return { error: dbError(error) };
  if (imgs?.length) await admin.supabase.storage.from("product-images").remove(imgs.map((i: any) => i.path));
  refresh();
  return {};
}
