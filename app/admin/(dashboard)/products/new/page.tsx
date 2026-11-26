import { ProductForm, emptyVariant } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/supabase/server";

export const metadata = { title: "منتج جديد" };

export default async function NewProductPage() {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { data } = await admin.supabase.from("categories").select("id, name, parent_id").order("sort_order");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">منتج جديد</h1>
      <ProductForm
        categories={data ?? []}
        defaultValues={{
          name: "", brand: "", model: "", category_id: "", condition: "new", description: "",
          retail_price: 0, wholesale_price: 0, is_active: true, is_featured: false, is_offer: false,
          specs: [], variants: [{ ...emptyVariant }],
        }}
      />
    </div>
  );
}
