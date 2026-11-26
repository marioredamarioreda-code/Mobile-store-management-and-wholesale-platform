"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/server";
import { normalizeWhatsApp } from "@/lib/phone";
import { dbError } from "@/lib/db-error";

const url = z.string().trim().max(300).refine((v) => v === "" || /^https?:\/\//i.test(v), "الرابط يجب أن يبدأ بـ https://");
const schema = z.object({
  store_name: z.string().trim().min(2, "اسم المتجر مطلوب").max(80),
  description: z.string().trim().max(500),
  phone: z.string().trim().max(30),
  whatsapp: z.string().trim().max(30),
  address: z.string().trim().max(200),
  facebook_url: url,
  instagram_url: url,
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "رمز العملة 3 حروف مثل EGP"),
  logo_path: z.string().regex(/^logo-[0-9a-f-]{36}\.(webp|png|jpe?g)$/i).nullable(),
});

export async function saveSettings(input: unknown): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "غير مصرح" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const sb = admin.supabase;

  const { data: old } = await sb.from("store_settings").select("logo_path").eq("id", true).maybeSingle();
  const { error } = await sb.from("store_settings").upsert({
    id: true, store_name: v.store_name, description: v.description || null, phone: v.phone || null,
    whatsapp: normalizeWhatsApp(v.whatsapp) || null, address: v.address || null,
    facebook_url: v.facebook_url || null, instagram_url: v.instagram_url || null, currency: v.currency, logo_path: v.logo_path,
  });
  if (error) return { error: dbError(error) };
  if (old?.logo_path && old.logo_path !== v.logo_path) await sb.storage.from("store-assets").remove([old.logo_path]);

  revalidateTag("catalog");
  revalidatePath("/", "layout");
  return {};
}
