"use client";

import Image from "next/image";
import { useState } from "react";
import { Smartphone } from "lucide-react";

export function Gallery({ urls, alt }: { urls: string[]; alt: string }) {
  const [i, setI] = useState(0);
  if (urls.length === 0) {
    return <div className="flex aspect-square items-center justify-center rounded-xl bg-muted text-muted-foreground"><Smartphone className="h-20 w-20" /></div>;
  }
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-card">
        <Image src={urls[i]} alt={alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-contain p-4" />
      </div>
      {urls.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {urls.map((u, idx) => (
            <li key={u}>
              <button type="button" onClick={() => setI(idx)} aria-label={`صورة ${idx + 1}`} aria-current={idx === i}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-card ${idx === i ? "border-primary" : "border-transparent"}`}>
                <Image src={u} alt="" fill sizes="64px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
