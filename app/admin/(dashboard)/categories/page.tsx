import { CategoriesManager } from "@/components/admin/categories-manager";
import { requireAdmin } from "@/lib/supabase/server";

export const metadata = { title: "الفئات" };

export default async function CategoriesPage() {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { data, error } = await admin.supabase
    .from("categories").select("id, name, parent_id, is_active, sort_order").order("sort_order").order("created_at");
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">الفئات</h1>
        <p className="text-sm text-muted-foreground">رتّب الفئات بالأسهم، والفئات الفرعية تظهر تحت أصلها.</p>
      </header>
      <CategoriesManager categories={data ?? []} />
    </div>
  );
}
