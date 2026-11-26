import { redirect } from "next/navigation";
import { LogOut, Smartphone } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/admin/actions";
import { createClient, requireAdmin } from "@/lib/supabase/server";

export const metadata = { title: "لوحة التحكم", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  if (!admin) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/admin/login");
    // Signed in but not an admin: show a clear message, never the dashboard.
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-bold">ليس لديك صلاحية الدخول</h1>
          <p className="text-sm text-muted-foreground">
            هذا الحساب غير مسجّل كمدير. سجّل الخروج وادخل بحساب مدير، أو اطلب من صاحب المتجر إضافتك.
          </p>
          <form action={logoutAction}><Button type="submit">تسجيل الخروج</Button></form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="bg-primary p-4 text-primary-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:gap-8 lg:p-5">
        <div className="mb-3 flex items-center justify-between lg:mb-0">
          <div className="flex items-center gap-3 font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Smartphone className="h-4 w-4" />
            </span>
            لوحة الإدارة
          </div>
          <form action={logoutAction} className="lg:hidden">
            <Button type="submit" variant="ghost" size="icon" aria-label="تسجيل الخروج" className="hover:bg-white/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
        <AdminNav />
        <div className="mt-auto hidden space-y-3 lg:block">
          <p className="truncate text-xs text-primary-foreground/60" dir="ltr">{admin.user.email}</p>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" className="w-full justify-start text-primary-foreground hover:bg-white/10">
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </Button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
