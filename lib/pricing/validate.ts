export interface RuleDraft {
  customer_type: "retail" | "wholesale";
  min_qty: number;
  max_qty: number | null;
  discount_type: "percent" | "amount_off" | "fixed_price";
  value: number;
}

const label = { retail: "القطاعي", wholesale: "الجملة" } as const;

/** Returns an Arabic error message, or null when the tiers are valid. Used by client AND server. */
export function validateRules(rules: RuleDraft[]): string | null {
  for (const r of rules) {
    if (!Number.isInteger(r.min_qty) || r.min_qty < 1) return "أقل كمية يجب أن تكون رقمًا صحيحًا 1 أو أكثر";
    if (r.max_qty !== null && (!Number.isInteger(r.max_qty) || r.max_qty < r.min_qty))
      return "أكبر كمية يجب ألا تقل عن أقل كمية (اتركها فارغة لشريحة مفتوحة مثل 10+)";
    if (!Number.isFinite(r.value) || r.value < 0) return "قيمة الخصم غير صحيحة";
    if (r.discount_type === "percent" && r.value > 100) return "نسبة الخصم لا تزيد عن 100%";
  }
  for (const type of ["retail", "wholesale"] as const) {
    const s = rules.filter((r) => r.customer_type === type).sort((a, b) => a.min_qty - b.min_qty);
    for (let i = 1; i < s.length; i++) {
      if (s[i].min_qty <= (s[i - 1].max_qty ?? Infinity))
        return `شرائح ${label[type]} متداخلة عند الكمية ${s[i].min_qty}`;
    }
  }
  return null;
}
