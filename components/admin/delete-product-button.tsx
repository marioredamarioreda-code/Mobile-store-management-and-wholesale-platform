"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/app/admin/(dashboard)/products/actions";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="icon" aria-label={`حذف ${name}`} disabled={pending}
      onClick={() => {
        if (!confirm(`حذف "${name}" نهائيًا مع كل نسخه؟ لا يمكن التراجع.`)) return;
        start(async () => {
          const r = await deleteProduct(id);
          if (r.error) alert(r.error); else router.refresh();
        });
      }}>
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
