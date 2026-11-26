import { z } from "zod";

const money = z.number({ invalid_type_error: "اكتب رقمًا" }).min(0, "لا يقل عن صفر").max(100_000_000);
const count = z.number({ invalid_type_error: "اكتب رقمًا" }).int("رقم صحيح فقط").min(0, "لا يقل عن صفر").max(1_000_000);

export const variantSchema = z.object({
  id: z.string().optional(),
  color: z.string().trim().max(50),
  storage: z.string().trim().max(50),
  ram: z.string().trim().max(50),
  sku: z.string().trim().max(80),
  barcode: z.string().trim().max(80),
  purchase_cost: money,
  stock_quantity: count,
  low_stock_threshold: count,
});

export const productSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, "اسم المنتج مطلوب").max(150),
    brand: z.string().trim().max(60),
    model: z.string().trim().max(80),
    category_id: z.string(), // "" = no category
    condition: z.enum(["new", "used", "refurbished"]),
    description: z.string().trim().max(5000),
    retail_price: money,
    wholesale_price: money,
    is_active: z.boolean(),
    is_featured: z.boolean(),
    is_offer: z.boolean(),
    specs: z.array(z.object({ key: z.string().trim().max(60), value: z.string().trim().max(200) })).max(30),
    variants: z.array(variantSchema).min(1, "أضف نسخة واحدة على الأقل").max(60),
  })
  .refine((p) => p.wholesale_price <= p.retail_price, {
    path: ["wholesale_price"],
    message: "سعر الجملة يجب ألا يزيد عن سعر القطاعي",
  });

export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "اسم الفئة مطلوب").max(80),
  parent_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
});
export type CategoryInput = z.infer<typeof categorySchema>;
