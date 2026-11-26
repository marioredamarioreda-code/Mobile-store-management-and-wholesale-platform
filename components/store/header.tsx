import Image from "next/image";
import Link from "next/link";
import { Phone, Search, Smartphone } from "lucide-react";
import { getCategories, getSettings } from "@/lib/catalog";
import { logoUrl } from "@/lib/images";

export async function StoreHeader() {
  const [s, cats] = await Promise.all([getSettings(), getCategories()]);
  const logo = logoUrl(s.logo_path);
  const roots = cats.filter((c) => !c.parent_id);
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          {logo ? (
            <Image src={logo} alt={s.store_name} width={40} height={40} className="h-10 w-10 rounded-md object-contain" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground"><Smartphone className="h-5 w-5" /></span>
          )}
          <span className="text-lg">{s.store_name}</span>
        </Link>
        <form action="/products" method="get" role="search" className="order-3 flex w-full flex-1 sm:order-none sm:w-auto">
          <input name="q" type="search" placeholder="ابحث عن موبايل، ماركة، موديل..." aria-label="بحث"
            className="h-11 w-full rounded-s-md border border-e-0 border-input bg-background px-3 text-sm" />
          <button type="submit" aria-label="بحث" className="flex h-11 w-12 items-center justify-center rounded-e-md bg-primary text-primary-foreground">
            <Search className="h-4 w-4" />
          </button>
        </form>
        {s.phone && (
          <a href={`tel:${s.phone}`} className="ms-auto flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium sm:ms-0">
            <Phone className="h-4 w-4" /> <span dir="ltr">{s.phone}</span>
          </a>
        )}
      </div>
      {roots.length > 0 && (
        <nav aria-label="الأقسام" className="border-t bg-background">
          <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 text-sm">
            <li><Link href="/products" className="block whitespace-nowrap rounded-md px-3 py-1.5 font-medium hover:bg-muted">كل المنتجات</Link></li>
            {roots.map((c) => (
              <li key={c.id}><Link href={`/category/${encodeURIComponent(c.slug)}`} className="block whitespace-nowrap rounded-md px-3 py-1.5 hover:bg-muted">{c.name}</Link></li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
