import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MovementForm } from "@/components/admin/movement-form";
import { requireAdmin } from "@/lib/supabase/server";

export const metadata = { title: "المخزون" };
const dateFmt = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" });
const typeLabel: Record<string, string> = { purchase: "شراء", sale: "بيع", adjustment: "تسوية", return: "مرتجع" };

const label = (name: string | undefined, v: { color?: string | null; storage?: string | null; ram?: string | null }) =>
  `${name ?? "منتج"} — ${[v.color, v.storage, v.ram].filter(Boolean).join(" / ") || "افتراضي"}`;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { filter } = await searchParams;
  const sb = admin.supabase;

  const [vars, moves] = await Promise.all([
    sb.from("product_variants")
      .select("id, color, storage, ram, sku, stock_quantity, low_stock_threshold, product_id, products(name)")
      .eq("is_active", true).limit(1000),
    sb.from("inventory_movements")
      .select("id, type, quantity, note, created_at, product_variants(color, storage, ram, products(name))")
      .order("created_at", { ascending: false }).limit(30),
  ]);
  if (vars.error) throw new Error(vars.error.message);
  if (moves.error) throw new Error(moves.error.message);

  const all = ((vars.data ?? []) as any[]).sort((a, b) => a.stock_quantity - b.stock_quantity);
  const status = (v: any) => (v.stock_quantity === 0 ? "out" : v.stock_quantity <= v.low_stock_threshold ? "low" : "ok");
  const shown = all.filter((v) => !filter || status(v) === filter);
  const tab = (f: string | undefined, text: string) => (
    <Link href={f ? `/admin/inventory?filter=${f}` : "/admin/inventory"}
      className={`rounded-md px-3 py-1.5 text-sm ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{text}</Link>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">المخزون</h1>
        <p className="text-sm text-muted-foreground">كل تغيير في الكمية يُسجَّل هنا تلقائيًا.</p>
      </header>

      <MovementForm variants={all.map((v) => ({ id: v.id, label: label(v.products?.name, v), stock: v.stock_quantity }))} />

      <div className="flex gap-2">{tab(undefined, "الكل")}{tab("low", "منخفض")}{tab("out", "نفد")}</div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b bg-muted/50 text-muted-foreground">
            <tr>{["الصنف", "SKU", "الكمية", "الحالة"].map((h) => <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {shown.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا توجد أصناف.</td></tr>}
            {shown.map((v) => {
              const s = status(v);
              return (
                <tr key={v.id}>
                  <td className="px-4 py-3"><Link className="hover:underline" href={`/admin/products/${v.product_id}`}>{label(v.products?.name, v)}</Link></td>
                  <td className="px-4 py-3" dir="ltr">{v.sku ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold">{v.stock_quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs ${s === "out" ? "bg-destructive/10 text-destructive" : s === "low" ? "bg-accent/20" : "bg-emerald-100 text-emerald-800"}`}>
                      {s === "out" ? "نفد" : s === "low" ? "منخفض" : "متوفر"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">آخر الحركات</h2>
        <Card>
          {(moves.data ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">لا توجد حركات بعد.</p>
          ) : (
            <ul className="divide-y">
              {(moves.data as any[]).map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <span>{label(m.product_variants?.products?.name, m.product_variants ?? {})}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-muted-foreground">{typeLabel[m.type]}{m.note ? ` — ${m.note}` : ""}</span>
                    <b dir="ltr" className={m.quantity > 0 ? "text-emerald-700" : "text-destructive"}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</b>
                    <time className="text-xs text-muted-foreground">{dateFmt.format(new Date(m.created_at))}</time>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
