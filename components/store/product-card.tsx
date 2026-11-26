import Image from "next/image";
import Link from "next/link";
import { Smartphone } from "lucide-react";
import type { ProductItem } from "@/lib/catalog";
import { productImageUrl } from "@/lib/images";
import { formatEGP } from "@/lib/utils";

export function ProductCard({ p, currency = "EGP", priority = false }: { p: ProductItem; currency?: string; priority?: boolean }) {
  const specs = Object.entries(p.specs).slice(0, 2);
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg">
      <Link href={`/products/${encodeURIComponent(p.slug)}`} className="flex flex-1 flex-col" aria-label={p.name}>
        <div className="relative aspect-square bg-muted">
          {p.image_path ? (
            <Image src={productImageUrl(p.image_path)} alt={p.name} fill priority={priority}
              sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
              className="object-contain p-3 transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground"><Smartphone className="h-12 w-12" /></div>
          )}
          <div className="absolute start-2 top-2 flex flex-col gap-1">
            {p.is_offer && <span className="rounded bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">عرض خاص</span>}
            {!p.in_stock && <span className="rounded bg-foreground px-2 py-0.5 text-xs font-bold text-background">نفد المخزون</span>}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="text-xs text-muted-foreground">{[p.brand, p.model].filter(Boolean).join(" · ") || p.category_name}</p>
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug">{p.name}</h3>
          {specs.length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {specs.map(([k, v]) => <li key={k} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{v || k}</li>)}
            </ul>
          )}
          {p.colors && p.colors.length > 0 && <p className="text-xs text-muted-foreground">الألوان: {p.colors.slice(0, 4).join("، ")}</p>}
          <div className="mt-auto space-y-0.5 pt-2">
            <p className="text-lg font-bold text-primary">{formatEGP(p.retail_price, currency)} <span className="text-xs font-normal text-muted-foreground">قطاعي</span></p>
            <p className="text-xs text-muted-foreground">جملة: {formatEGP(p.wholesale_price, currency)} — خصم أكبر بالكمية</p>
          </div>
          <span className={`mt-2 rounded-md py-2 text-center text-sm font-semibold ${p.in_stock ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            عرض التفاصيل
          </span>
        </div>
      </Link>
    </article>
  );
}
