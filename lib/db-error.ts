export function dbError(e: { code?: string; message: string }) {
  if (e.code === "23505") return "قيمة مكررة: الاسم أو SKU أو الباركود مستخدم بالفعل.";
  if (e.code === "42501") return "ليس لديك صلاحية لتنفيذ هذا الإجراء.";
  if (e.code === "23514") return "قيمة غير مسموح بها (مثلًا مخزون أقل من صفر).";
  if (e.code === "23P01") return "شرائح الكميات متداخلة.";
  return e.message;
}
