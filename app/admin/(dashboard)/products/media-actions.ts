"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/supabase/server";
import { dbError } from "@/lib/db-error";

type Result = { error?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validPath = (productId: string, path: string) =>
  UUID.test(productId) && path.startsWith(`${productId}/`) && !path.includes("..") && /\.(webp|jpe?g|png|avif)$/i.test(path);

function done(productId: string): Result {
  revalidatePath(`/admin/products/${productId}`);
  revalidateTag("catalog");
  return {};
}

export async function addProductImage(productId: string, path: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "غير مصرح" };
  if (!validPath(productId, path)) return { error: "مسار الصورة غير صحيح" };
  const sb = admin.supabase;
  const { count } = await sb.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  const { error } = await sb.from("product_images").insert({
    product_id: productId, path, sort_order: count ?? 0, is_primary: (count ?? 0) === 0,
  });
  return error ? { error: dbError(error) } : done(productId);
}

export async function setPrimaryImage(imageId: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "غير مصرح" };
  const sb = admin.supabase;
  const { data: img } = await sb.from("product_images").select("product_id").eq("id", imageId).single();
  if (!img) return { error: "الصورة غير موجودة" };
  // the unique partial index allows only one primary: clear first, then set
  const a = await sb.from("product_images").update({ is_primary: false }).eq("product_id", img.product_id);
  if (a.error) return { error: dbError(a.error) };
  const b = await sb.from("product_images").update({ is_primary: true }).eq("id", imageId);
  return b.error ? { error: dbError(b.error) } : done(img.product_id);
}

export async function deleteProductImage(imageId: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "غير مصرح" };
  const sb = admin.supabase;
  const { data: img } = await sb.from("product_images").select("product_id, path, is_primary").eq("id", imageId).single();
  if (!img) return { error: "الصورة غير موجودة" };
  const { error } = await sb.from("product_images").delete().eq("id", imageId);
  if (error) return { error: dbError(error) };
  await sb.storage.from("product-images").remove([img.path]);
  if (img.is_primary) {
    const { data: next } = await sb.from("product_images").select("id").eq("product_id", img.product_id).order("sort_order").limit(1);
    if (next?.[0]) await sb.from("product_images").update({ is_primary: true }).eq("id", next[0].id);
  }
  return done(img.product_id);
}

export async function replaceProductImage(imageId: string, newPath: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "غير مصرح" };
  const sb = admin.supabase;
  const { data: img } = await sb.from("product_images").select("product_id, path").eq("id", imageId).single();
  if (!img) return { error: "الصورة غير موجودة" };
  if (!validPath(img.product_id, newPath)) return { error: "مسار الصورة غير صحيح" };
  const { error } = await sb.from("product_images").update({ path: newPath }).eq("id", imageId);
  if (error) return { error: dbError(error) };
  await sb.storage.from("product-images").remove([img.path]);
  return done(img.product_id);
}
