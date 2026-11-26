"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}
      className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 font-semibold text-primary-foreground print:hidden">
      <Printer className="h-4 w-4" /> طباعة
    </button>
  );
}
