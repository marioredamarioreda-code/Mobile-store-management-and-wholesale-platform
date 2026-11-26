"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { productSchema, type ProductInput } from "@/lib/validation/product";
import { saveProduct } from "@/app/admin/(dashboard)/products/actions";
import { formatEGP } from "@/lib/utils";

interface Cat { id: string; name: string; parent_id: string | null }

export const emptyVariant = {
  id: "", color: "", storage: "", ram: "", sku: "", barcode: "",
  purchase_cost: 0, stock_quantity: 0, low_stock_threshold: 3,
};

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function VariantProfit({ control, index }: { control: Control<ProductInput>; index: number }) {
  const cost = useWatch({ control, name: `variants.${index}.purchase_cost` });
  const retail = useWatch({ control, name: "retail_price" });
  const wholesale = useWatch({ control, name: "wholesale_price" });
  if ([cost, retail, wholesale].some((n) => typeof n !== "number" || Number.isNaN(n))) return null;
  const r = retail - cost, w = wholesale - cost;
  const tone = (n: number) => (n < 0 ? "text-destructive" : "text-emerald-700");
  return (
    <p className="text-xs text-muted-foreground">
      ربح القطاعي للقطعة: <b className={tone(r)}>{formatEGP(r)}</b> — ربح الجملة للقطعة: <b className={tone(w)}>{formatEGP(w)}</b> (للإدارة فقط)
    </p>
  );
}

export function ProductForm({ defaultValues, categories }: { defaultValues: ProductInput; categories: Cat[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const { register, control, handleSubmit, formState: { errors } } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });
  const variants = useFieldArray({ control, name: "variants", keyName: "_key" });
  const specs = useFieldArray({ control, name: "specs", keyName: "_key" });

  const roots = categories.filter((c) => !c.parent_id);
  const onSubmit = (values: ProductInput) => {
    setMessage(null);
    start(async () => {
      const res = await saveProduct({ ...values, id: defaultValues.id });
      if ("error" in res) return setMessage({ type: "error", text: res.error });
      if (!defaultValues.id) router.push(`/admin/products/${res.id}`);
      else { setMessage({ type: "ok", text: "تم حفظ التعديلات" }); router.refresh(); }
    });
  };

  const err = (m?: { message?: string }) => m?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader><CardTitle>البيانات الأساسية</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم المنتج" error={err(errors.name)} className="sm:col-span-2">
            <Input {...register("name")} placeholder="مثال: Samsung Galaxy A55" />
          </Field>
          <Field label="الماركة" error={err(errors.brand)}><Input {...register("brand")} placeholder="Samsung" /></Field>
          <Field label="الموديل" error={err(errors.model)}><Input {...register("model")} placeholder="A55" /></Field>
          <Field label="الفئة" error={err(errors.category_id)}>
            <Select {...register("category_id")}>
              <option value="">بدون فئة</option>
              {roots.map((r) => (
                <optgroup key={r.id} label={r.name}>
                  <option value={r.id}>{r.name}</option>
                  {categories.filter((c) => c.parent_id === r.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="الحالة">
            <Select {...register("condition")}>
              <option value="new">جديد</option><option value="used">مستعمل</option><option value="refurbished">مجدّد</option>
            </Select>
          </Field>
          <Field label="الوصف" error={err(errors.description)} className="sm:col-span-2">
            <Textarea {...register("description")} placeholder="وصف المنتج ومميزاته" />
          </Field>
          <div className="flex flex-wrap gap-6 sm:col-span-2">
            {([["is_active", "ظاهر في المتجر"], ["is_featured", "منتج مميز"], ["is_offer", "عرض خاص"]] as const).map(([name, label]) => (
              <label key={name} className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" className="h-4 w-4" {...register(name)} /> {label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الأسعار</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="سعر القطاعي (ج.م)" error={err(errors.retail_price)}>
            <Input type="number" step="0.01" min="0" inputMode="decimal" {...register("retail_price", { valueAsNumber: true })} />
          </Field>
          <Field label="سعر الجملة الأساسي (ج.م)" error={err(errors.wholesale_price)}>
            <Input type="number" step="0.01" min="0" inputMode="decimal" {...register("wholesale_price", { valueAsNumber: true })} />
          </Field>
          <p className="text-xs text-muted-foreground sm:col-span-2">شرائح خصم الكميات والصور تظهر في أسفل هذه الصفحة بعد حفظ المنتج لأول مرة.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>النسخ والمخزون (لون / سعة / رام)</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => variants.append({ ...emptyVariant })}>
            <Plus className="h-4 w-4" /> نسخة
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {(errors.variants?.message || errors.variants?.root?.message) && (
            <p className="text-sm text-destructive">{errors.variants?.message ?? errors.variants?.root?.message}</p>
          )}
          {variants.fields.map((f, i) => {
            const ve = errors.variants?.[i];
            return (
              <div key={f._key} className="space-y-3 rounded-lg border p-4">
                <input type="hidden" {...register(`variants.${i}.id`)} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="اللون" error={err(ve?.color)}><Input {...register(`variants.${i}.color`)} placeholder="أسود" /></Field>
                  <Field label="السعة" error={err(ve?.storage)}><Input {...register(`variants.${i}.storage`)} placeholder="128GB" /></Field>
                  <Field label="الرام" error={err(ve?.ram)}><Input {...register(`variants.${i}.ram`)} placeholder="8GB" /></Field>
                  <Field label="SKU" error={err(ve?.sku)}><Input dir="ltr" {...register(`variants.${i}.sku`)} /></Field>
                  <Field label="الباركود" error={err(ve?.barcode)}><Input dir="ltr" {...register(`variants.${i}.barcode`)} /></Field>
                  <Field label="تكلفة الشراء (ج.م)" error={err(ve?.purchase_cost)}>
                    <Input type="number" step="0.01" min="0" inputMode="decimal" {...register(`variants.${i}.purchase_cost`, { valueAsNumber: true })} />
                  </Field>
                  <Field label="الكمية في المخزون" error={err(ve?.stock_quantity)}>
                    <Input type="number" min="0" inputMode="numeric" {...register(`variants.${i}.stock_quantity`, { valueAsNumber: true })} />
                  </Field>
                  <Field label="تنبيه عند أقل من" error={err(ve?.low_stock_threshold)}>
                    <Input type="number" min="0" inputMode="numeric" {...register(`variants.${i}.low_stock_threshold`, { valueAsNumber: true })} />
                  </Field>
                  <div className="flex items-end justify-end">
                    <Button type="button" variant="ghost" size="sm" disabled={variants.fields.length === 1}
                      onClick={() => variants.remove(i)} className="text-destructive">
                      <Trash2 className="h-4 w-4" /> حذف النسخة
                    </Button>
                  </div>
                </div>
                <VariantProfit control={control} index={i} />
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">تغيير الكمية يُسجَّل تلقائيًا في سجل حركة المخزون.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>المواصفات</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => specs.append({ key: "", value: "" })}>
            <Plus className="h-4 w-4" /> مواصفة
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {specs.fields.length === 0 && <p className="text-sm text-muted-foreground">مثال: الشاشة — 6.6 بوصة، البطارية — 5000 mAh.</p>}
          {specs.fields.map((f, i) => (
            <div key={f._key} className="flex gap-2">
              <Input placeholder="الاسم (الشاشة)" {...register(`specs.${i}.key`)} aria-label="اسم المواصفة" />
              <Input placeholder="القيمة (6.6 بوصة)" {...register(`specs.${i}.value`)} aria-label="قيمة المواصفة" />
              <Button type="button" variant="ghost" size="icon" aria-label="حذف المواصفة" onClick={() => specs.remove(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {message && (
        <p role="alert" className={`rounded-md p-3 text-sm ${message.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-destructive/10 text-destructive"}`}>
          {message.text}
        </p>
      )}
      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t bg-background/95 p-4 backdrop-blur sm:-mx-6 lg:-mx-8 lg:px-8">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} حفظ المنتج
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => router.push("/admin/products")}>رجوع للقائمة</Button>
      </div>
    </form>
  );
}
