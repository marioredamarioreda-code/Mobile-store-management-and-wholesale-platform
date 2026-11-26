import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { PrintButton } from "@/components/admin/print-button";
import { requireAdmin } from "@/lib/supabase/server";
import { resolvePublicUrl } from "@/lib/site-url";

export const metadata = { title: "طباعة رمز QR", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PrintQrPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const info = resolvePublicUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (!info.ok || !info.url) {
    return <main className="p-10 text-center text-destructive">{info.reason ?? "رابط المتجر غير صالح"}</main>;
  }
  const { data: s } = await admin.supabase.from("store_settings").select("store_name").eq("id", true).maybeSingle();
  const svg = await QRCode.toString(info.url, { type: "svg", errorCorrectionLevel: "H", margin: 2 });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">{s?.store_name ?? "المتجر"}</h1>
      <p className="text-xl">امسح الكود لتصفح المنتجات والأسعار</p>
      <div className="w-[16cm] max-w-full bg-white p-2 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <p dir="ltr" className="text-lg font-medium">{info.url}</p>
      <PrintButton />
    </main>
  );
}
