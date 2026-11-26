"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { logoUrl } from "@/lib/images";
import { saveSettings } from "@/app/admin/(dashboard)/settings/actions";

export interface SettingsValues {
  store_name: string; description: string; phone: string; whatsapp: string; address: string;
  facebook_url: string; instagram_url: string; currency: string; logo_path: string | null;
}

type SetFn = (k: keyof SettingsValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;

// Defined at module level so inputs keep focus while typing.
function F({ label, k, v, set, dir, ph }: { label: string; k: keyof SettingsValues; v: SettingsValues; set: SetFn; dir?: "ltr"; ph?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} dir={dir} placeholder={ph} value={(v[k] as string) ?? ""} onChange={set(k)} />
    </div>
  );
}

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl(initial.logo_path));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof SettingsValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      try {
        let logo_path = v.logo_path;
        if (file) {
          const c = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 512, useWebWorker: true, fileType: "image/webp" });
          logo_path = `logo-${crypto.randomUUID()}.webp`;
          const { error } = await createClient().storage.from("store-assets").upload(logo_path, c, { contentType: "image/webp", cacheControl: "31536000" });
          if (error) throw new Error(error.message);
        }
        const r = await saveSettings({ ...v, logo_path });
        if (r.error) return setMsg({ ok: false, text: r.error });
        setV({ ...v, logo_path }); setFile(null);
        setMsg({ ok: true, text: "تم الحفظ، والتغييرات ظاهرة الآن في المتجر" });
        router.refresh();
      } catch (err) {
        setMsg({ ok: false, text: err instanceof Error ? err.message : "حدث خطأ" });
      }
    });
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader><CardTitle>هوية المتجر</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview ? <img src={preview} alt="الشعار" className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">لا شعار</span>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="logo">الشعار</Label>
              <input id="logo" type="file" accept="image/*" className="block text-sm"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); } }} />
            </div>
          </div>
          <F v={v} set={set} label="اسم المتجر" k="store_name" />
          <div className="space-y-1.5"><Label htmlFor="description">وصف المتجر</Label>
            <Textarea id="description" value={v.description} onChange={set("description")} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>بيانات التواصل</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <F v={v} set={set} label="رقم الهاتف" k="phone" dir="ltr" ph="01001234567" />
          <F v={v} set={set} label="رقم واتساب" k="whatsapp" dir="ltr" ph="01001234567" />
          <div className="sm:col-span-2"><F v={v} set={set} label="العنوان" k="address" /></div>
          <F v={v} set={set} label="رابط فيسبوك" k="facebook_url" dir="ltr" ph="https://facebook.com/..." />
          <F v={v} set={set} label="رابط إنستجرام" k="instagram_url" dir="ltr" ph="https://instagram.com/..." />
          <F v={v} set={set} label="العملة (رمز من 3 حروف)" k="currency" dir="ltr" ph="EGP" />
        </CardContent>
      </Card>

      {msg && <p role="alert" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-destructive/10 text-destructive"}`}>{msg.text}</p>}
      <Button type="submit" size="lg" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} حفظ الإعدادات</Button>
    </form>
  );
}
