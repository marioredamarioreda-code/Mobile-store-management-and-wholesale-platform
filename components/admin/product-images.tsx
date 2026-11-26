"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { ImagePlus, Loader2, RefreshCw, Star, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { productImageUrl } from "@/lib/images";
import { addProductImage, deleteProductImage, replaceProductImage, setPrimaryImage } from "@/app/admin/(dashboard)/products/media-actions";

export interface ProductImage { id: string; path: string; is_primary: boolean }
interface Pending { file: File; url: string }

const MAX_ORIGINAL = 15 * 1024 * 1024;

async function compressAndUpload(productId: string, file: File): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.6, maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/webp",
  });
  const path = `${productId}/${crypto.randomUUID()}.webp`;
  const { error } = await createClient().storage.from("product-images").upload(path, compressed, {
    contentType: "image/webp", cacheControl: "31536000", upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export function ProductImages({ productId, images }: { productId: string; images: ProductImage[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const replaceTarget = useRef<string | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const pick = (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const ok: Pending[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) { setError(`"${f.name}" ليس صورة`); continue; }
      if (f.size > MAX_ORIGINAL) { setError(`"${f.name}" أكبر من 15 ميجا`); continue; }
      ok.push({ file: f, url: URL.createObjectURL(f) });
    }
    setPending((p) => [...p, ...ok].slice(0, 10));
  };

  const clearPending = () => { pending.forEach((p) => URL.revokeObjectURL(p.url)); setPending([]); };

  const uploadAll = async () => {
    setBusy("upload"); setError(null);
    try {
      for (const p of pending) {
        const path = await compressAndUpload(productId, p.file);
        const r = await addProductImage(productId, path);
        if (r.error) throw new Error(r.error);
      }
      clearPending();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل رفع الصور");
    } finally { setBusy(null); }
  };

  const act = async (key: string, fn: () => Promise<{ error?: string }>) => {
    setBusy(key); setError(null);
    try {
      const r = await fn();
      if (r.error) setError(r.error); else router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "حدث خطأ"); }
    finally { setBusy(null); }
  };

  const onReplace = async (file: File | undefined) => {
    const id = replaceTarget.current;
    if (!file || !id) return;
    await act(`replace-${id}`, async () => {
      const path = await compressAndUpload(productId, file);
      return replaceProductImage(id, path);
    });
    if (replaceInput.current) replaceInput.current.value = "";
  };

  return (
    <Card>
      <CardHeader><CardTitle>صور المنتج</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد صور بعد. أضف صورة واحدة على الأقل ليظهر المنتج بشكل جيد في المتجر.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
              <li key={img.id} className="space-y-2 rounded-lg border p-2">
                <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImageUrl(img.path)} alt="صورة المنتج" loading="lazy" className="h-full w-full object-contain" />
                  {img.is_primary && (
                    <span className="absolute start-2 top-2 rounded bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">رئيسية</span>
                  )}
                  {busy?.endsWith(img.id) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  )}
                </div>
                <div className="flex justify-between">
                  <Button type="button" size="icon" variant="ghost" aria-label="جعلها الصورة الرئيسية" disabled={img.is_primary || !!busy}
                    onClick={() => act(`primary-${img.id}`, () => setPrimaryImage(img.id))}>
                    <Star className={`h-4 w-4 ${img.is_primary ? "fill-accent text-accent" : ""}`} />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" aria-label="استبدال الصورة" disabled={!!busy}
                    onClick={() => { replaceTarget.current = img.id; replaceInput.current?.click(); }}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" aria-label="حذف الصورة" disabled={!!busy}
                    onClick={() => confirm("حذف هذه الصورة؟") && act(`delete-${img.id}`, () => deleteProductImage(img.id))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <input ref={replaceInput} type="file" accept="image/*" className="hidden" onChange={(e) => onReplace(e.target.files?.[0])} />

        <div className="space-y-3 rounded-lg border border-dashed p-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 py-4 text-center text-sm text-muted-foreground">
            <ImagePlus className="h-8 w-8" />
            <span>اضغط لاختيار صور من الجهاز أو الكاميرا (حتى 10 صور، يتم ضغطها وتحويلها تلقائيًا)</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
          </label>

          {pending.length > 0 && (
            <>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {pending.map((p, i) => (
                  <li key={p.url} className="relative aspect-square overflow-hidden rounded-md bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="معاينة" className="h-full w-full object-cover" />
                    <button type="button" aria-label="إزالة" disabled={busy === "upload"}
                      className="absolute end-1 top-1 rounded-full bg-background/90 p-1"
                      onClick={() => { URL.revokeObjectURL(p.url); setPending((x) => x.filter((_, j) => j !== i)); }}>
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button type="button" onClick={uploadAll} disabled={busy === "upload"}>
                  {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  رفع {pending.length} صورة
                </Button>
                <Button type="button" variant="outline" onClick={clearPending} disabled={busy === "upload"}>إلغاء</Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
