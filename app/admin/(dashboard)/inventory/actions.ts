"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/server";
import { dbError } from "@/lib/db-error";

const schema = z.object({
  variant_id: z.string().uuid("اختر الصنف"),
  type: z.enum(["purchase", "sale", "adjustment", "return"]),
  quantity: z.number({ invalid_type_error: "اكتب الكمية" }).int("رقم صحيح فقط").refine((n) => n !== 0, "الكمية لا تساوي صفر").refine((n) => Math.abs(n) <= 1_000_000, "كمية كبيرة جدًا"),
  note: z.string().trim().max(200),
});

export async function addMovement(input: unknown): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "غير مصرح" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { variant_id, type, quantity, note } = parsed.data;

  // purchase/return add stock, sale removes it, adjustment keeps the typed sign
  const signed = type === "sale" ? -Math.abs(quantity) : type === "adjustment" ? quantity : Math.abs(quantity);
  const { error } = await admin.supabase.from("inventory_movements").insert({
    variant_id, type, quantity: signed, note: note || null, created_by: admin.user.id,
  });
  if (error) return { error: error.code === "23514" ? "المخزون الحالي لا يكفي لهذه العملية" : dbError(error) };
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return {};
}
