import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/supabase/server";

export const metadata = { title: "إعدادات المتجر" };

export default async function SettingsPage() {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { data: s } = await admin.supabase.from("store_settings").select("*").eq("id", true).maybeSingle();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">إعدادات المتجر</h1>
        <p className="text-sm text-muted-foreground">تظهر هذه البيانات في المتجر العام مباشرة بعد الحفظ.</p>
      </header>
      <SettingsForm initial={{
        store_name: s?.store_name ?? "متجر الموبايلات", description: s?.description ?? "", phone: s?.phone ?? "",
        whatsapp: s?.whatsapp ?? "", address: s?.address ?? "", facebook_url: s?.facebook_url ?? "",
        instagram_url: s?.instagram_url ?? "", currency: s?.currency ?? "EGP", logo_path: s?.logo_path ?? null,
      }} />
    </div>
  );
}
