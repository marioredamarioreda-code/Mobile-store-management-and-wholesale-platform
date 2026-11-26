import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const font = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "متجر الموبايلات — جملة وقطاعي", template: "%s | متجر الموبايلات" },
  description: "موبايلات وإكسسوارات بأسعار الجملة والقطاعي في مصر.",
  openGraph: { locale: "ar_EG", type: "website" },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#0b3b3c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={font.variable}>
      <body>{children}</body>
    </html>
  );
}
