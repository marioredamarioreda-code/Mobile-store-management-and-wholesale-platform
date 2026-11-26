import Link from "next/link";
import { SearchX } from "lucide-react";
import { PAGE_SIZE, getBrands, getCategories, getSettings, listProducts, type Filters } from "@/lib/catalog";
import { ProductCard } from "./product-card";

export async function CatalogView({ filters, basePath, fixedCategory }: { filters: Filters; basePath: string; fixedCategory?: boolean }) {
  const [{ items, total }, cats, brands, settings] = await Promise.all([listProducts(filters), getCategories(), getBrands(), getSettings()]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = filters.page ?? 1;

  const href = (p: number) => {
    const u = new URLSearchParams();
    if (filters.q) u.set("q", filters.q);
    if (!fixedCategory && filters.category) u.set("category", filters.category);
    if (filters.brand) u.set("brand", filters.brand);
    if (filters.min != null) u.set("min", String(filters.min));
    if (filters.max != null) u.set("max", String(filters.max));
    if (filters.inStock) u.set("stock", "1");
    if (filters.sort && filters.sort !== "newest") u.set("sort", filters.sort);
    if (p > 1) u.set("page", String(p));
    const qs = u.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const roots = cats.filter((c) => !c.parent_id);
  const field = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <form method="get" action={basePath} className="h-fit space-y-3 rounded-xl border bg-card p-4 lg:sticky lg:top-32">
        <h2 className="font-semibold">تصفية وترتيب</h2>
        <input name="q" defaultValue={filters.q} placeholder="بحث" aria-label="بحث" className={field} />
        {!fixedCategory && (
          <select name="category" defaultValue={filters.category ?? ""} aria-label="القسم" className={field}>
            <option value="">كل الأقسام</option>
            {roots.map((r) => (
              <optgroup key={r.id} label={r.name}>
                <option value={r.slug}>كل {r.name}</option>
                {cats.filter((c) => c.parent_id === r.id).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </optgroup>
            ))}
          </select>
        )}
        <select name="brand" defaultValue={filters.brand ?? ""} aria-label="الماركة" className={field}>
          <option value="">كل الماركات</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input name="min" type="number" min="0" inputMode="numeric" defaultValue={filters.min} placeholder="أقل سعر" aria-label="أقل سعر" className={field} />
          <input name="max" type="number" min="0" inputMode="numeric" defaultValue={filters.max} placeholder="أعلى سعر" aria-label="أعلى سعر" className={field} />
        </div>
        <select name="sort" defaultValue={filters.sort} aria-label="الترتيب" className={field}>
          <option value="newest">الأحدث</option><option value="price_asc">الأقل سعرًا</option>
          <option value="price_desc">الأعلى سعرًا</option><option value="name">أبجدي</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="stock" value="1" defaultChecked={filters.inStock} className="h-4 w-4" /> المتوفر فقط</label>
        <div className="flex gap-2">
          <button type="submit" className="h-10 flex-1 rounded-md bg-primary text-sm font-semibold text-primary-foreground">تطبيق</button>
          <Link href={basePath} className="flex h-10 items-center rounded-md border px-4 text-sm">مسح</Link>
        </div>
      </form>

      <section aria-live="polite">
        <p className="mb-4 text-sm text-muted-foreground">{total} منتج{filters.q ? ` لنتيجة البحث «${filters.q}»` : ""}</p>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center text-muted-foreground">
            <SearchX className="h-10 w-10" />
            <p>لا توجد منتجات مطابقة. جرّب تغيير البحث أو إزالة بعض الفلاتر.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {items.map((p, i) => <li key={p.id}><ProductCard p={p} currency={settings.currency} priority={i < 4} /></li>)}
          </ul>
        )}
        {pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-4 text-sm" aria-label="الصفحات">
            {page > 1 && <Link className="rounded-md border px-4 py-2" href={href(page - 1)}>السابق</Link>}
            <span>صفحة {page} من {pages}</span>
            {page < pages && <Link className="rounded-md border px-4 py-2" href={href(page + 1)}>التالي</Link>}
          </nav>
        )}
      </section>
    </div>
  );
}
