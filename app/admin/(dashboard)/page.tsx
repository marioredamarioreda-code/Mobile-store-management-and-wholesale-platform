import { AlertTriangle, Boxes, FolderTree, PackageX, Package, TrendingUp, Wallet, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StockChart } from "@/components/admin/stock-chart";
import { getOverview } from "@/lib/admin/overview";
import { requireAdmin } from "@/lib/supabase/server";
import { formatEGP } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" });
const fieldLabel: Record<string, string> = { retail_price: "سعر القطاعي", wholesale_price: "سعر الجملة" };

function Stat({ title, value, icon: Icon, tone = "default", hint }: {
  title: string; value: string; icon: React.ElementType; tone?: "default" | "warn" | "danger"; hint?: string;
}) {
  const toneCls = { default: "bg-primary/10 text-primary", warn: "bg-accent/20 text-accent-foreground", danger: "bg-destructive/10 text-destructive" }[tone];
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 truncate text-2xl font-bold">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${toneCls}`}><Icon className="h-5 w-5" /></span>
      </CardContent>
    </Card>
  );
}

export default async function OverviewPage() {
  const admin = await requireAdmin();
  if (!admin) return null; // layout already blocks; this keeps the page safe on its own
  const o = await getOverview(admin.supabase);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">نظرة عامة</h1>
        <p className="text-sm text-muted-foreground">ملخص المنتجات والمخزون والأرباح المتوقعة.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="الإحصائيات">
        <Stat title="إجمالي المنتجات" value={String(o.productCount)} icon={Package} />
        <Stat title="إجمالي الفئات" value={String(o.categoryCount)} icon={FolderTree} />
        <Stat title="قيمة المخزون (بالتكلفة)" value={formatEGP(o.costValue)} icon={Boxes} />
        <Stat title="قيمة المخزون (بيع قطاعي)" value={formatEGP(o.retailValue)} icon={Tag} />
        <Stat title="الربح المتوقع (قطاعي)" value={formatEGP(o.expectedRetailProfit)} icon={TrendingUp}
              hint={o.retailValue > 0 ? `هامش ${((o.expectedRetailProfit / o.retailValue) * 100).toFixed(1)}%` : undefined} />
        <Stat title="الربح المتوقع (جملة)" value={formatEGP(o.expectedWholesaleProfit)} icon={Wallet}
              hint={o.wholesaleValue > 0 ? `هامش ${((o.expectedWholesaleProfit / o.wholesaleValue) * 100).toFixed(1)}%` : undefined} />
        <Stat title="أصناف مخزونها منخفض" value={String(o.lowStock)} icon={AlertTriangle} tone="warn" />
        <Stat title="أصناف نفد مخزونها" value={String(o.outOfStock)} icon={PackageX} tone="danger" />
      </section>

      <Card>
        <CardHeader><CardTitle>قيمة المخزون حسب الفئة</CardTitle></CardHeader>
        <CardContent><StockChart data={o.byCategory} /></CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>آخر المنتجات المضافة</CardTitle></CardHeader>
          <CardContent>
            {o.recentProducts.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">لا توجد منتجات بعد. ستظهر هنا بعد إضافتها من صفحة المنتجات.</p>
            ) : (
              <ul className="divide-y">
                {o.recentProducts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{p.name}{p.brand ? ` — ${p.brand}` : ""}</span>
                    <time className="shrink-0 text-xs text-muted-foreground">{dateFmt.format(new Date(p.created_at))}</time>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>آخر تعديلات الأسعار</CardTitle></CardHeader>
          <CardContent>
            {o.recentPriceChanges.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">لم يتم تغيير أي سعر بعد.</p>
            ) : (
              <ul className="divide-y">
                {o.recentPriceChanges.map((c) => (
                  <li key={c.id} className="space-y-1 py-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="truncate font-medium">{c.products?.name ?? "منتج محذوف"}</span>
                      <time className="shrink-0 text-xs text-muted-foreground">{dateFmt.format(new Date(c.changed_at))}</time>
                    </div>
                    <p className="text-muted-foreground">
                      {fieldLabel[c.field] ?? c.field}: {formatEGP(Number(c.old_value ?? 0))} ← {formatEGP(Number(c.new_value ?? 0))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
