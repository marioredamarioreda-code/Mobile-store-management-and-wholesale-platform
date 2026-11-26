import { AlertTriangle, Download, ExternalLink, Printer } from "lucide-react";
import QRCode from "qrcode";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/admin/copy-button";
import { resolvePublicUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

export const metadata = { title: "رمز QR" };
export const dynamic = "force-dynamic";

export default async function QrPage() {
  const info = resolvePublicUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const svg = info.ok && info.url ? await QRCode.toString(info.url, { type: "svg", errorCorrectionLevel: "H", margin: 2 }) : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">رمز QR للمتجر</h1>
        <p className="text-sm text-muted-foreground">اطبعه وضعه في المحل أو على الفواتير ليفتح العميل المتجر مباشرة من الموبايل.</p>
      </header>

      {!info.ok || !svg || !info.url ? (
        <Card className="border-destructive/40">
          <CardContent className="space-y-3 p-6">
            <p className="flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="h-5 w-5" /> لا يمكن إنشاء الرمز الآن</p>
            <p className="text-sm">{info.reason}</p>
            <p className="text-sm text-muted-foreground">
              لحماية الرمز المطبوع من أن يشير لرابط مؤقت، يجب ضبط الرابط الدائم للمتجر. في Vercel افتح
              Settings ← Environment Variables وأضف <code dir="ltr" className="rounded bg-muted px-1">NEXT_PUBLIC_SITE_URL</code> بقيمة مثل
              <code dir="ltr" className="mx-1 rounded bg-muted px-1">https://your-store.com</code> ثم أعد النشر (Redeploy).
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardContent className="p-5">
              <div className="rounded-lg bg-white p-2 [&>svg]:h-auto [&>svg]:w-full" role="img" aria-label="رمز QR لرابط المتجر"
                dangerouslySetInnerHTML={{ __html: svg }} />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>الرابط المرتبط بالرمز</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p dir="ltr" className="break-all rounded-md bg-muted p-3 text-sm font-medium">{info.url}</p>
                <div className="flex flex-wrap gap-2">
                  <CopyButton text={info.url} />
                  <a href={info.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <ExternalLink className="h-4 w-4" /> فتح المتجر
                  </a>
                </div>
                {info.isVercelDomain && (
                  <p className="text-xs text-amber-700">
                    هذا رابط vercel.app. يعمل جيدًا، لكن إن كنت ستغيّر الدومين لاحقًا فسيتوقف الرمز المطبوع. الأفضل ربط دومين خاص قبل الطباعة.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>تنزيل وطباعة</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <a href="/admin/qr-download?format=png&size=2048" className={cn(buttonVariants())}><Download className="h-4 w-4" /> PNG (2048px)</a>
                <a href="/admin/qr-download?format=png&size=4096" className={cn(buttonVariants({ variant: "outline" }))}><Download className="h-4 w-4" /> PNG للطباعة الكبيرة (4096px)</a>
                <a href="/admin/qr-download?format=svg" className={cn(buttonVariants({ variant: "outline" }))}><Download className="h-4 w-4" /> SVG (متجهي)</a>
                <a href="/admin/qr-print" target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "accent" }))}><Printer className="h-4 w-4" /> طباعة</a>
              </CardContent>
            </Card>

            <p className="text-xs leading-relaxed text-muted-foreground">
              نصيحة: جرّب مسح الرمز بكاميرا موبايلك قبل الطباعة النهائية. استخدم SVG أو PNG الكبير للافتات والبانرات، وA4 يكفيه PNG 2048.
              الرمز بمستوى تصحيح أخطاء عالٍ (H) فيظل مقروءًا حتى لو اتّسخ جزء منه.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
