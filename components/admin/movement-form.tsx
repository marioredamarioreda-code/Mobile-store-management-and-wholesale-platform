"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addMovement } from "@/app/admin/(dashboard)/inventory/actions";

export function MovementForm({ variants }: { variants: { id: string; label: string; stock: number }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [variantId, setVariantId] = useState("");
  const [type, setType] = useState("purchase");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const r = await addMovement({ variant_id: variantId, type, quantity: Number(qty), note });
      if (r.error) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: "تم تسجيل الحركة" });
      setQty(""); setNote(""); router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader><CardTitle>تسجيل حركة مخزون</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_2fr_auto]">
          <Select value={variantId} onChange={(e) => setVariantId(e.target.value)} aria-label="الصنف" required>
            <option value="">اختر الصنف</option>
            {variants.map((v) => <option key={v.id} value={v.id}>{v.label} (المتاح {v.stock})</option>)}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="نوع الحركة">
            <option value="purchase">شراء (+)</option><option value="sale">بيع (−)</option>
            <option value="return">مرتجع (+)</option><option value="adjustment">تسوية (+/−)</option>
          </Select>
          <Input type="number" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="الكمية" aria-label="الكمية" required />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" aria-label="ملاحظة" />
          <Button type="submit" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} تسجيل</Button>
        </form>
        {msg && <p role="alert" className={`mt-3 text-sm ${msg.ok ? "text-emerald-700" : "text-destructive"}`}>{msg.text}</p>}
        <p className="mt-3 text-xs text-muted-foreground">في «التسوية» اكتب رقمًا سالبًا للنقص (مثل -2). في البقية يُحدَّد الاتجاه تلقائيًا.</p>
      </CardContent>
    </Card>
  );
}
