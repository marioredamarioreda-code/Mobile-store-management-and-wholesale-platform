"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, MessageCircle, Phone } from "lucide-react";
import { calculatePrice, type CustomerType, type PricingRule } from "@/lib/pricing/engine";
import { formatEGP } from "@/lib/utils";

interface Variant { id: string; color: string | null; storage: string | null; ram: string | null; in_stock: boolean; low_stock: boolean }

const variantLabel = (v: Variant) => [v.color, v.storage, v.ram].filter(Boolean).join(" · ") || "الافتراضي";

export function PriceCalculator({ name, retailPrice, wholesalePrice, rules, variants, whatsapp, phone, currency }: {
  name: string; retailPrice: number; wholesalePrice: number; rules: PricingRule[]; variants: Variant[];
  whatsapp: string | null; phone: string | null; currency: string;
}) {
  const [type, setType] = useState<CustomerType>("retail");
  const [qty, setQty] = useState(1);
  const firstAvailable = variants.find((v) => v.in_stock) ?? variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id ?? "");
  const variant = variants.find((v) => v.id === variantId);
  const anyInStock = variants.some((v) => v.in_stock);

  const r = useMemo(
    () => calculatePrice({ retailPrice, wholesalePrice, rules, customerType: type, quantity: qty }),
    [retailPrice, wholesalePrice, rules, type, qty]
  );

  const tiers = useMemo(() => {
    const list = rules.filter((x) => x.customerType === type);
    return list.map((rule) => ({
      rule,
      label: rule.maxQty === null ? `${rule.minQty}+ قطعة` : rule.minQty === rule.maxQty ? `${rule.minQty} قطعة` : `${rule.minQty}–${rule.maxQty} قطعة`,
      price: calculatePrice({ retailPrice, wholesalePrice, rules, customerType: type, quantity: rule.minQty }),
    }));
  }, [rules, type, retailPrice, wholesalePrice]);

  const money = (n: number) => formatEGP(n, currency);
  const setQuantity = (n: number) => setQty(Math.min(9999, Math.max(1, Math.floor(n) || 1)));

  const message = [
    "مرحبًا، أريد طلب:",
    `المنتج: ${name}`,
    variant ? `النسخة: ${variantLabel(variant)}` : "",
    `نوع الشراء: ${type === "wholesale" ? "جملة" : "قطاعي"}`,
    `الكمية: ${qty}`,
    `سعر القطعة: ${money(r.unitPrice)}`,
    `الإجمالي: ${money(r.total)}`,
  ].filter(Boolean).join("\n");

  return (
    <div className="space-y-5 rounded-xl border bg-card p-5">
      {variants.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">اختر النسخة</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button key={v.id} type="button" disabled={!v.in_stock} onClick={() => setVariantId(v.id)} aria-pressed={v.id === variantId}
                className={`rounded-md border px-3 py-2 text-sm ${v.id === variantId ? "border-primary bg-primary text-primary-foreground" : "bg-background"} disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through`}>
                {variantLabel(v)}
              </button>
            ))}
          </div>
          {variant && <p className={`text-xs ${variant.in_stock ? (variant.low_stock ? "text-amber-700" : "text-emerald-700") : "text-destructive"}`}>
            {variant.in_stock ? (variant.low_stock ? "كمية محدودة" : "متوفر") : "غير متوفر حاليًا"}
          </p>}
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="نوع الشراء">
        {(["retail", "wholesale"] as const).map((t) => (
          <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)}
            className={`rounded-md py-2 text-sm font-semibold ${type === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            {t === "retail" ? "قطاعي" : "جملة (تجار)"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label htmlFor="qty" className="text-sm font-semibold">الكمية</label>
        <div className="flex w-fit items-center rounded-md border">
          <button type="button" aria-label="إنقاص" onClick={() => setQuantity(qty - 1)} className="flex h-11 w-11 items-center justify-center"><Minus className="h-4 w-4" /></button>
          <input id="qty" type="number" min={1} max={9999} inputMode="numeric" value={qty} onChange={(e) => setQuantity(Number(e.target.value))}
            className="h-11 w-20 border-x bg-background text-center" />
          <button type="button" aria-label="زيادة" onClick={() => setQuantity(qty + 1)} className="flex h-11 w-11 items-center justify-center"><Plus className="h-4 w-4" /></button>
        </div>
      </div>

      <dl className="space-y-2 rounded-lg bg-muted/60 p-4 text-sm" aria-live="polite">
        <div className="flex justify-between"><dt className="text-muted-foreground">السعر الأصلي</dt><dd className={r.ruleApplied && r.savingsPerUnit > 0 ? "line-through" : ""}>{money(r.basePrice)}</dd></div>
        {r.savingsPerUnit > 0 && (
          <div className="flex justify-between text-emerald-700"><dt>الخصم</dt><dd>{r.discountPercent}% (وفّر {money(r.savingsPerUnit)} للقطعة)</dd></div>
        )}
        <div className="flex justify-between"><dt className="text-muted-foreground">سعر القطعة</dt><dd className="font-semibold">{money(r.unitPrice)}</dd></div>
        <div className="flex justify-between border-t pt-2 text-base"><dt className="font-semibold">الإجمالي</dt><dd className="text-xl font-bold text-primary">{money(r.total)}</dd></div>
      </dl>

      {tiers.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold">خصومات الكمية ({type === "wholesale" ? "جملة" : "قطاعي"})</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {tiers.map(({ rule, label, price }) => (
                <tr key={rule.minQty} className={qty >= rule.minQty && (rule.maxQty === null || qty <= rule.maxQty) ? "font-semibold text-primary" : ""}>
                  <td className="py-1.5">{label}</td>
                  <td className="py-1.5">{price.discountPercent > 0 ? `خصم ${price.discountPercent}%` : "—"}</td>
                  <td className="py-1.5 text-end">{money(price.unitPrice)} / قطعة</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">أسعار الجملة وخصومات الكميات تختلف حسب العدد، تواصل معنا للحصول على أفضل سعر.</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"
            aria-disabled={!anyInStock}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-[#25D366] font-semibold text-white ${anyInStock ? "" : "pointer-events-none opacity-50"}`}>
            <MessageCircle className="h-5 w-5" /> اطلب عبر واتساب
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md border font-semibold">
            <Phone className="h-5 w-5" /> اتصل بنا
          </a>
        )}
      </div>
      {!anyInStock && <p className="text-sm font-medium text-destructive">هذا المنتج غير متوفر حاليًا، تواصل معنا لمعرفة موعد التوفر.</p>}
    </div>
  );
}
