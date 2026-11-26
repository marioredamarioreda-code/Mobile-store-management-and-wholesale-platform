import Link from "next/link";
import { Battery, Cable, Headphones, Package, Smartphone, Tablet, Watch, type LucideIcon } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { getCategories, getHome, getSettings, type ProductItem } from "@/lib/catalog";

const iconFor = (slug: string): LucideIcon =>
  slug.includes("tablet") ? Tablet : slug.includes("watch") ? Watch : slug.includes("headphone") ? Headphones
  : slug.includes("charger") || slug.includes("power") ? Battery : slug.includes("cable") ? Cable
  : slug.includes("access") || slug.includes("cover") || slug.includes("screen") ? Package : Smartphone;

function Section({ title, href, items, currency }: { title: string; href?: string; items: ProductItem[]; currency: string }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-12 space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        {href && <Link href={href} className="text-sm font-medium text-primary hover:underline">عرض الكل</Link>}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {items.map((p) => <li key={p.id}><ProductCard p={p} currency={currency} /></li>)}
      </ul>
    </section>
  );
}

export default async function HomePage() {
  const [s, cats, home] = await Promise.all([getSettings(), getCategories(), getHome()]);
  const roots = cats.filter((c) => !c.parent_id);
  return (
    <>
      <section className="overflow-hidden rounded-2xl bg-primary px-6 py-12 text-primary-foreground sm:px-12 sm:py-16">
        <p className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-sm">جملة وقطاعي</p>
        <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">{s.store_name}</h1>
        <p className="mt-4 max-w-xl text-primary-foreground/75">{s.description ?? "أحدث الموبايلات والإكسسوارات بأفضل الأسعار، وخصومات خاصة على الكميات للتجار."}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/products" className="rounded-md bg-accent px-6 py-3 font-semibold text-accent-foreground">تصفح المنتجات</Link>
          <a href="#contact" className="rounded-md border border-white/30 px-6 py-3 font-semibold">تواصل معنا</a>
        </div>
      </section>

      {roots.length > 0 && (
        <section className="mt-10" aria-label="الأقسام">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {roots.map((c) => {
              const Icon = iconFor(c.slug);
              return (
                <li key={c.id}>
                  <Link href={`/category/${encodeURIComponent(c.slug)}`} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center text-sm font-medium transition-colors hover:border-primary">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-6 w-6" /></span>
                    {c.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Section title="منتجات مميزة" items={home.featured} currency={s.currency} />
      <Section title="عروض خاصة" items={home.offers} currency={s.currency} href="/products?sort=price_asc" />
      <Section title="وصل حديثًا" items={home.latest} currency={s.currency} href="/products" />

      {home.latest.length === 0 && (
        <p className="mt-12 rounded-xl border border-dashed p-10 text-center text-muted-foreground">لم تتم إضافة منتجات بعد.</p>
      )}
    </>
  );
}
