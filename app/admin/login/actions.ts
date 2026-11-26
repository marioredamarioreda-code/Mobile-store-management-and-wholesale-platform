"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().trim().email("اكتب بريدًا إلكترونيًا صحيحًا"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
});

export async function loginAction(values: unknown): Promise<{ error: string } | never> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "هذا الحساب ليس لديه صلاحية دخول لوحة التحكم" };
  }
  redirect("/admin");
}
