import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4 py-20 text-center">
      <h1 className="text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="text-muted-foreground">ربما تم حذف المنتج أو تغيير الرابط.</p>
      <Link href="/products" className="inline-block rounded-md bg-primary px-5 py-2 text-primary-foreground">تصفح المنتجات</Link>
    </div>
  );
}
