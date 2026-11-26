import { Facebook, Instagram, MapPin, MessageCircle, Phone } from "lucide-react";
import { getSettings } from "@/lib/catalog";

export async function StoreFooter() {
  const s = await getSettings();
  return (
    <footer id="contact" className="mt-16 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <h2 className="text-lg font-bold">{s.store_name}</h2>
          {s.description && <p className="mt-2 text-sm leading-relaxed text-primary-foreground/70">{s.description}</p>}
        </div>
        <ul className="space-y-3 text-sm">
          {s.phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4" /><a href={`tel:${s.phone}`} dir="ltr">{s.phone}</a></li>}
          {s.whatsapp && <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /><a href={`https://wa.me/${s.whatsapp}`} dir="ltr">{s.whatsapp}</a></li>}
          {s.address && <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{s.address}</li>}
        </ul>
        <div className="flex gap-3">
          {s.facebook_url && <a href={s.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك" className="rounded-full bg-white/10 p-3"><Facebook className="h-5 w-5" /></a>}
          {s.instagram_url && <a href={s.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="إنستجرام" className="rounded-full bg-white/10 p-3"><Instagram className="h-5 w-5" /></a>}
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-primary-foreground/50">© {new Date().getFullYear()} {s.store_name}</p>
    </footer>
  );
}
