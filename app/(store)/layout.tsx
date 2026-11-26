import type { Metadata } from "next";
import { StoreHeader } from "@/components/store/header";
import { StoreFooter } from "@/components/store/footer";
import { WhatsAppFab } from "@/components/store/whatsapp-fab";
import { getSettings } from "@/lib/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: s.store_name, template: `%s | ${s.store_name}` },
    description: s.description ?? `${s.store_name} — موبايلات وإكسسوارات بأسعار الجملة والقطاعي.`,
  };
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StoreHeader />
      <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-6">{children}</main>
      <StoreFooter />
      <WhatsAppFab />
    </>
  );
}
