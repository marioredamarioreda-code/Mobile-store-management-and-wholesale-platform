"use client";

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4 py-20 text-center" role="alert">
      <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل الصفحة</h2>
      <p className="text-sm text-muted-foreground">حاول مرة أخرى بعد قليل.</p>
      <button onClick={reset} className="rounded-md bg-primary px-5 py-2 text-primary-foreground">إعادة المحاولة</button>
    </div>
  );
}
