"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, FolderTree, Boxes, Settings, QrCode, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Item { href: string; label: string; icon: LucideIcon; ready: boolean }

// `ready: false` items are shown as disabled until their phase is built.
const items: Item[] = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard, ready: true },
  { href: "/admin/products", label: "المنتجات", icon: Package, ready: true },
  { href: "/admin/categories", label: "الفئات", icon: FolderTree, ready: true },
  { href: "/admin/inventory", label: "المخزون", icon: Boxes, ready: true },
  { href: "/admin/qr", label: "رمز QR", icon: QrCode, ready: true },
  { href: "/admin/settings", label: "إعدادات المتجر", icon: Settings, ready: true },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="التنقل الرئيسي">
      {items.map(({ href, label, icon: Icon, ready }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        const cls = cn(
          "flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "bg-accent text-accent-foreground" : "text-primary-foreground/75 hover:bg-white/10",
          !ready && "cursor-not-allowed opacity-45 hover:bg-transparent"
        );
        return ready ? (
          <Link key={href} href={href} className={cls} aria-current={active ? "page" : undefined}>
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ) : (
          <span key={href} className={cls} aria-disabled="true">
            <Icon className="h-4 w-4" /> {label}
            <span className="ms-auto hidden text-xs lg:inline">قريبًا</span>
          </span>
        );
      })}
    </nav>
  );
}
