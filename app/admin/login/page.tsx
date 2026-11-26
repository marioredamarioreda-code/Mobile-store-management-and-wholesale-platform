import { redirect } from "next/navigation";
import { Smartphone } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { requireAdmin } from "@/lib/supabase/server";

export const metadata = { title: "تسجيل دخول الإدارة", robots: { index: false } };

export default async function LoginPage() {
  if (await requireAdmin()) redirect("/admin");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3 text-lg font-bold">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Smartphone className="h-5 w-5" />
          </span>
          لوحة إدارة المتجر
        </div>
        <div className="max-w-md space-y-3">
          <h1 className="text-3xl font-bold leading-snug">أسعارك ومخزونك في مكان واحد</h1>
          <p className="leading-relaxed text-primary-foreground/70">
            عدّل الأسعار وخصومات الكميات وتابع المخزون والأرباح، والتغييرات تظهر للعملاء فورًا.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/50">دخول المصرّح لهم فقط</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div>
            <h2 className="text-2xl font-bold">تسجيل الدخول</h2>
            <p className="mt-1 text-sm text-muted-foreground">أدخل بيانات حساب الإدارة للمتابعة.</p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
