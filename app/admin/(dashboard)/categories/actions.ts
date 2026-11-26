"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validation/product";
import { makeSlug } from "@/lib/slug";
import { dbError } from "@/lib/db-error";

type Result = { error: string } | { ok: true };
const done = (): Result => {
  revalidatePath("/admin/categories");
  revalidateTag("catalog");
  return { ok: true };
};

async function checkParent(sb: any, id: string | null, parentId: string | null): Promise<string | null> {
  if (!parentId) return null;
  if (id && parentId === id) return "لا يمكن جعل الفئة أصلًا لنفسها";
  const { data: parent } = await sb.from("categories").select("parent_id").eq("id", parentId).single();
  if (!parent) return "الفئة الأصل غير موجودة";
  if (parent.parent_id) return "الفئة الفرعية لا يمكن أن تكون أصلًا لفئة أخرى";
  if (id) {
    const { count } = await sb.from("categories").select("id", { count: "exact", head: true }).eq("parent_id", id);
    if (count) return "هذه الفئة لها فئات فرعية، لذلك لا يمكن جعلها فرعية";
  }
  return null;
}

export async function createCategory(input: unknown): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "غير مصرح" };
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, parent_id, is_active } = parsed.data;
  const sb = admin.supabase;

  const bad = await checkParent(sb, null, parent_id);
  if (bad) return { error: bad };

  let q = sb.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  q = parent_id ? q.eq("parent_id", parent_id) : q.is("parent_id", null);
  const { data: last } = await q;
  const sort_order = (last?.[0]?.sort_order ?? 0) + 1;

  const { error } = await sb.from("categories").insert({ name, parent_id, is_active, slug: makeSlug(name), sort_order });
  return error ? { error: dbError(error) } : done();
}

export async function updateCategory(id: string, input: unknown): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "غير مصرح" };
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const bad = await checkParent(admin.supabase, id, parsed.data.parent_id);
  if (bad) return { error: bad };
  const { error } = await admin.supabase.from("categories").update(parsed.data).eq("id", id);
  return error ? { error: dbError(error) } : done();
}

export async function deleteCategory(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "غير مصرح" };
  const { error } = await admin.supabase.from("categories").delete().eq("id", id);
  return error ? { error: dbError(error) } : done();
}

export async function moveCategory(id: string, direction: "up" | "down"): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "غير مصرح" };
  const sb = admin.supabase;
  const { data: me } = await sb.from("categories").select("id, parent_id").eq("id", id).single();
  if (!me) return { error: "الفئة غير موجودة" };

  let q = sb.from("categories").select("id").order("sort_order").order("created_at");
  q = me.parent_id ? q.eq("parent_id", me.parent_id) : q.is("parent_id", null);
  const { data: siblings } = await q;
  const ids: string[] = (siblings ?? []).map((s: { id: string }) => s.id);
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
  [ids[i], ids[j]] = [ids[j], ids[i]];

  for (const [idx, cid] of ids.entries()) {
    const { error } = await sb.from("categories").update({ sort_order: idx + 1 }).eq("id", cid);
    if (error) return { error: dbError(error) };
  }
  return done();
}
