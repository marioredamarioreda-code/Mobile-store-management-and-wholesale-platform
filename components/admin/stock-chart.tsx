"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEGP } from "@/lib/utils";

export function StockChart({ data }: { data: { name: string; cost: number; retail: number }[] }) {
  if (data.length === 0 || data.every((d) => d.cost === 0 && d.retail === 0)) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        أضف منتجات بكميات مخزون وتكلفة شراء ليظهر الرسم البياني هنا.
      </p>
    );
  }
  return (
    <div className="h-72 w-full" dir="ltr">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={70}
                 tickFormatter={(v: number) => new Intl.NumberFormat("en", { notation: "compact" }).format(v)} />
          <Tooltip formatter={(v: number) => formatEGP(v)} cursor={{ fill: "hsl(var(--muted))" }} />
          <Legend />
          <Bar dataKey="cost" name="قيمة التكلفة" fill="hsl(182 62% 16%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="retail" name="قيمة البيع (قطاعي)" fill="hsl(42 96% 48%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
