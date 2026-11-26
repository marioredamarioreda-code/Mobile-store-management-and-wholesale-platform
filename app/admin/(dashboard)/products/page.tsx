import Link from "next/link";
import { Eye, EyeOff, Pencil, Plus, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { requireAdmin } from "@/lib/supabase/server";
import { formatEGP } from "@/lib/utils";
import { toggleProductActive } from "./actions";

export const metadata = { title: "المنتجات" };
const PAGE = 25;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  if (!admin) return null;
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[%,()*]/g, " ").trim().toLowerCase();
  const page = Math.max(1, Number(sp.page) || 1);
  const sb = admin.supabase;

  let query = sb
    .from("products")
    .select("id, name, brand, model, retail_price, wholesale_price, is_active, categories(name), product_variants(stock_quantity)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.ilike("search_text", `%${q}%`);
  if (sp.category) query = query.eq("category_id", sp.category);
  if (sp.status === "active") query = query.eq("is_active", true);
  if (sp.status === "inactive") query = query.eq("is_active", false);

  const [{ data, count, error }, cats] = await Promise.all([
    query,
    sb.from("categories").select("id, name").order("sort_order"),
  ]);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => {
    const u = new URLSearchParams();
    for (const k of ["q", "category", "status"]) if (sp[k]) u.set(k, sp[k]!);
    u.set("page", String(p));
    return `/admin/products?${u}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">المنتجات</h1>
          <p className="text-sm text-muted-foreground">{total} منتج</p>
        </div>
        <Link href="/admin/products/new" className={buttonVariants()}><Plus className="h-4 w-4" /> منتج جديد</Link>
      </header>

      <form method="get" className="grid gap-3 sm:grid-cols-[1fr_200px_160px_auto]">
        <Input name="q" defaultValue={sp.q} placeholder="ابحث بالاسم أو الماركة أو الموديل" aria-label="بحث" />
        <Select name="category" defaultValue={sp.category ?? ""} aria-label="الفئة">
          <option value="">كل الفئات</option>
          {(cats.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select name="status" defaultValue={sp.status ?? ""} aria-label="الحالة">
          <option value="">كل الحالات</option><option value="active">ظاهر</option><option value="inactive">مخفي</option>
        </Select>
        <Button type="submit" variant="outline"><Search className="h-4 w-4" /> بحث</Button>
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/50 text-start text-muted-foreground">
            <tr>
              {["المنتج", "الفئة", "قطاعي", "جملة", "المخزون", "الحالة", ""].map((h) => <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y">
            {(data ?? []).length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">لا توجد منتجات مطابقة.</td></tr>
            )}
            {(data ?? []).map((p: any) => {
              const stock = (p.product_variants ?? []).reduce((s: number, v: any) => s + v.stock_quantity, 0);
              return (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    <p className="text-xs text-muted-foreground">{[p.brand, p.model].filter(Boolean).join(" — ")}</p>
                  </td>
                  <td className="px-4 py-3">{p.categories?.name ?? "—"}</td>
                  <td className="px-4 py-3">{formatEGP(Number(p.retail_price))}</td>
                  <td className="px-4 py-3">{formatEGP(Number(p.wholesale_price))}</td>
                  <td className={`px-4 py-3 font-medium ${stock === 0 ? "text-destructive" : ""}`}>{stock === 0 ? "نفد" : stock}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs ${p.is_active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                      {p.is_active ? "ظاهر" : "مخفي"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <form action={toggleProductActive.bind(null, p.id, !p.is_active)}>
                        <Button type="submit" variant="ghost" size="icon" aria-label={p.is_active ? "إخفاء" : "إظهار"}>
                          {p.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </form>
                      <Link href={`/admin/products/${p.id}`} aria-label="تعديل" className={buttonVariants({ variant: "ghost", size: "icon" })}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <DeleteProductButton id={p.id} name={p.name} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm" aria-label="الصفحات">
          {page > 1 && <Link className="underline" href={link(page - 1)}>السابق</Link>}
          <span>صفحة {page} من {pages}</span>
          {page < pages && <Link className="underline" href={link(page + 1)}>التالي</Link>}
        </nav>
      )}
    </div>
  );
}
