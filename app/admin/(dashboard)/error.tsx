"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center" role="alert">
      <h2 className="text-xl font-bold">تعذّر تحميل البيانات</h2>
      <p className="text-sm text-muted-foreground">
        تأكد من تشغيل ملف قاعدة البيانات في Supabase ومن صحة مفاتيح الاتصال في ملف البيئة، ثم حاول مرة أخرى.
      </p>
      <p className="text-xs text-muted-foreground" dir="ltr">{error.message}</p>
      <Button onClick={reset}>إعادة المحاولة</Button>
    </div>
  );
}
