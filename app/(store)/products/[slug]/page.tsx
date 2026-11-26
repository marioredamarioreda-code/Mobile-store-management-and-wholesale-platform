import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Gallery } from "@/components/store/gallery";
import { PriceCalculator } from "@/components/store/price-calculator";
import { getProduct, getSettings } from "@/lib/catalog";
import { productImageUrl } from "@/lib/images";

const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
const conditionLabel: Record<string, string> = { new: "جديد", used: "مستعمل", refurbished: "مجدّد" };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await getProduct(decode((await params).slug));
  if (!data) return { title: "منتج غير موجود" };
  const p = data.product;
  return {
    title: p.name,
    description: p.description?.slice(0, 160) ?? `${p.name} بأسعار الجملة والقطاعي`,
    openGraph: { title: p.name, images: p.image_path ? [productImageUrl(p.image_path)] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = decode((await params).slug);
  const [data, s] = await Promise.all([getProduct(slug), getSettings()]);
  if (!data) notFound();
  const { product: p, images, variants, rules } = data;
  const specs = Object.entries(p.specs);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    image: images.map(productImageUrl), description: p.description ?? undefined,
    offers: { "@type": "Offer", priceCurrency: s.currency, price: p.retail_price, availability: p.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  return (
    <div className="space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="مسار التنقل" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">الرئيسية</Link> / <Link href="/products" className="hover:underline">المنتجات</Link> / <span className="text-foreground">{p.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <Gallery urls={images.map(productImageUrl)} alt={p.name} />
        <div className="space-y-5">
          <div>
            <p className="text-sm text-muted-foreground">{[p.brand, p.model, p.category_name].filter(Boolean).join(" · ")}</p>
            <h1 className="mt-1 text-2xl font-bold leading-snug sm:text-3xl">{p.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-muted px-2 py-1">{conditionLabel[p.condition] ?? p.condition}</span>
              <span className={`rounded px-2 py-1 ${p.in_stock ? "bg-emerald-100 text-emerald-800" : "bg-destructive/10 text-destructive"}`}>{p.in_stock ? "متوفر" : "نفد المخزون"}</span>
              {p.is_offer && <span className="rounded bg-accent px-2 py-1 font-bold text-accent-foreground">عرض خاص</span>}
            </div>
          </div>
          <PriceCalculator name={p.name} retailPrice={p.retail_price} wholesalePrice={p.wholesale_price} rules={rules}
            variants={variants} whatsapp={s.whatsapp} phone={s.phone} currency={s.currency} />
        </div>
      </div>

      {(p.description || specs.length > 0) && (
        <div className="grid gap-8 lg:grid-cols-2">
          {p.description && (
            <section className="space-y-2">
              <h2 className="text-lg font-bold">الوصف</h2>
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{p.description}</p>
            </section>
          )}
          {specs.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-bold">المواصفات</h2>
              <dl className="divide-y rounded-xl border bg-card">
                {specs.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
