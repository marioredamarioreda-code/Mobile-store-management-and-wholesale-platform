import { MessageCircle } from "lucide-react";
import { getSettings } from "@/lib/catalog";

export async function WhatsAppFab() {
  const { whatsapp, store_name } = await getSettings();
  if (!whatsapp) return null;
  const text = encodeURIComponent(`مرحبًا ${store_name}، أريد الاستفسار عن منتجاتكم.`);
  return (
    <a href={`https://wa.me/${whatsapp}?text=${text}`} target="_blank" rel="noopener noreferrer" aria-label="تواصل عبر واتساب"
      className="fixed bottom-5 start-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105">
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
