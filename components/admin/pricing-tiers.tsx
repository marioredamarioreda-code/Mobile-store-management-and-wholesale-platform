"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculatePrice, type CustomerType, type DiscountType } from "@/lib/pricing/engine";
import { validateRules, type RuleDraft } from "@/lib/pricing/validate";
import { savePricingRules } from "@/app/admin/(dashboard)/products/pricing-actions";
import { formatEGP } from "@/lib/utils";

interface Row { customer_type: CustomerType; min: string; max: string; discount_type: DiscountType; value: string }
export interface SavedRule { customer_type: CustomerType; min_qty: number; max_qty: number | null; discount_type: DiscountType; value: number }

const typeLabel: Record<CustomerType, string> = { retail: "القطاعي", wholesale: "الجملة" };
const discountLabel: Record<DiscountType, string> = { percent: "نسبة %", amount_off: "خصم مبلغ", fixed_price: "سعر ثابت للقطعة" };

const toDraft = (r: Row): RuleDraft => ({
  customer_type: r.customer_type,
  min_qty: Number(r.min),
  max_qty: r.max.trim() === "" ? null : Number(r.max),
  discount_type: r.discount_type,
  value: Number(r.value),
});

export function PricingTiers({ productId, retailPrice, wholesalePrice, initial }: {
  productId: string; retailPrice: number; wholesalePrice: number; initial: SavedRule[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<Row[]>(
    initial.map((r) => ({
      customer_type: r.customer_type, min: String(r.min_qty), max: r.max_qty === null ? "" : String(r.max_qty),
      discount_type: r.discount_type, value: String(r.value),
    }))
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [qty, setQty] = useState(3);
  const [previewType, setPreviewType] = useState<CustomerType>("wholesale");

  const drafts = rows.map(toDraft);
  const problem = useMemo(() => validateRules(drafts), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => {
    if (problem || !Number.isInteger(qty) || qty < 1) return null;
    return calculatePrice({
      retailPrice, wholesalePrice, customerType: previewType, quantity: qty,
      rules: drafts.map((d) => ({ customerType: d.customer_type, minQty: d.min_qty, maxQty: d.max_qty, discountType: d.discount_type, value: d.value })),
    });
  }, [rows, qty, previewType, problem, retailPrice, wholesalePrice]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const add = (t: CustomerType) => setRows((r) => [...r, { customer_type: t, min: "", max: "", discount_type: "percent", value: "" }]);
  const addExample = () =>
    setRows((r) => [
      ...r.filter((x) => x.customer_type !== "wholesale"),
      ...([["2", "2", "5"], ["3", "4", "7"], ["5", "9", "10"]] as const).map(([min, max, value]) => ({
        customer_type: "wholesale" as const, min, max, discount_type: "percent" as const, value,
      })),
    ]);

  const save = () => {
    setMsg(null);
    start(async () => {
      const res = await savePricingRules(productId, drafts);
      if (res.error) setMsg({ ok: false, text: res.error });
      else { setMsg({ ok: true, text: "تم حفظ الشرائح" }); router.refresh(); }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>شرائح خصم الكميات</CardTitle>
        <p className="text-sm text-muted-foreground">
          الكمية الأقل من أول شريحة تُباع بالسعر الأساسي. اترك «إلى» فارغة لشريحة مفتوحة (مثل 10 فأكثر).
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {(["wholesale", "retail"] as CustomerType[]).map((t) => (
          <section key={t} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">شرائح {typeLabel[t]}</h3>
              <div className="flex gap-2">
                {t === "wholesale" && <Button type="button" size="sm" variant="ghost" onClick={addExample}>شرائح مقترحة</Button>}
                <Button type="button" size="sm" variant="outline" onClick={() => add(t)}><Plus className="h-4 w-4" /> شريحة</Button>
              </div>
            </div>
            {rows.every((r) => r.customer_type !== t) && <p className="text-sm text-muted-foreground">لا توجد شرائح — يُباع بالسعر الأساسي دائمًا.</p>}
            {rows.map((r, i) => r.customer_type !== t ? null : (
              <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.3fr_1fr_auto]">
                <Input type="number" min="1" inputMode="numeric" placeholder="من كمية" aria-label="من كمية" value={r.min} onChange={(e) => update(i, { min: e.target.value })} />
                <Input type="number" min="1" inputMode="numeric" placeholder="إلى (فارغ = مفتوح)" aria-label="إلى كمية" value={r.max} onChange={(e) => update(i, { max: e.target.value })} />
                <Select aria-label="نوع الخصم" value={r.discount_type} onChange={(e) => update(i, { discount_type: e.target.value as DiscountType })}>
                  {Object.entries(discountLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
                <Input type="number" min="0" step="0.01" inputMode="decimal" placeholder="القيمة" aria-label="القيمة" value={r.value} onChange={(e) => update(i, { value: e.target.value })} />
                <Button type="button" variant="ghost" size="icon" aria-label="حذف الشريحة" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </section>
        ))}

        {problem && rows.length > 0 && <p role="alert" className="text-sm text-destructive">{problem}</p>}

        <div className="space-y-3 rounded-lg bg-muted/60 p-4">
          <h3 className="text-sm font-semibold">معاينة الحساب (بالأسعار المحفوظة للمنتج)</h3>
          <div className="flex flex-wrap gap-3">
            <Select className="w-32" aria-label="نوع العميل" value={previewType} onChange={(e) => setPreviewType(e.target.value as CustomerType)}>
              <option value="wholesale">جملة</option><option value="retail">قطاعي</option>
            </Select>
            <Input className="w-28" type="number" min="1" inputMode="numeric" aria-label="الكمية" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>
          {preview ? (
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div><dt className="text-muted-foreground">السعر الأصلي</dt><dd className="font-semibold">{formatEGP(preview.basePrice)}</dd></div>
              <div><dt className="text-muted-foreground">الخصم</dt><dd className="font-semibold">{preview.discountPercent}%</dd></div>
              <div><dt className="text-muted-foreground">سعر القطعة</dt><dd className="font-semibold">{formatEGP(preview.unitPrice)}</dd></div>
              <div><dt className="text-muted-foreground">الإجمالي</dt><dd className="font-semibold">{formatEGP(preview.total)}</dd></div>
            </dl>
          ) : <p className="text-sm text-muted-foreground">صحّح الشرائح أو الكمية لعرض المعاينة.</p>}
        </div>

        {msg && <p role="alert" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-destructive/10 text-destructive"}`}>{msg.text}</p>}
        <Button type="button" onClick={save} disabled={pending || !!problem}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} حفظ الشرائح
        </Button>
      </CardContent>
    </Card>
  );
}
