"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/server";
import { validateRules } from "@/lib/pricing/validate";
import { dbError } from "@/lib/db-error";

const schema = z.array(
  z.object({
    customer_type: z.enum(["retail", "wholesale"]),
    min_qty: z.number().int(),
    max_qty: z.number().int().nullable(),
    discount_type: z.enum(["percent", "amount_off", "fixed_price"]),
    value: z.number().min(0).max(100_000_000),
  })
).max(30);

export async function savePricingRules(productId: string, input: unknown): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "غير مصرح" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "بيانات الشرائح غير صحيحة" };
  const bad = validateRules(parsed.data);
  if (bad) return { error: bad };

  const { error } = await admin.supabase.rpc("replace_pricing_rules", { p_product: productId, p_rules: parsed.data });
  if (error) {
    if (error.code === "PGRST202") return { error: "شغّل ملف 0002_pricing_rpc.sql في Supabase أولًا" };
    return { error: dbError(error) };
  }
  revalidatePath(`/admin/products/${productId}`);
  revalidateTag("catalog");
  return {};
}
