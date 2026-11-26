"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCategory, deleteCategory, moveCategory, updateCategory } from "@/app/admin/(dashboard)/categories/actions";

export interface Cat { id: string; name: string; parent_id: string | null; is_active: boolean; sort_order: number }

export function CategoriesManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", parent_id: "", is_active: true });

  const roots = categories.filter((c) => !c.parent_id);
  const rows = roots.flatMap((r) => [r, ...categories.filter((c) => c.parent_id === r.id)]);

const run = (fn: () => Promise<any>, after?: () => void) => {    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else { after?.(); router.refresh(); }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>إضافة فئة</CardTitle></CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => createCategory({ name, parent_id: parent || null, is_active: true }), () => setName(""));
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الفئة (مثال: ساعات ذكية)" aria-label="اسم الفئة" />
            <Select value={parent} onChange={(e) => setParent(e.target.value)} className="sm:max-w-56" aria-label="الفئة الأصل">
              <option value="">فئة رئيسية</option>
              {roots.map((r) => <option key={r.id} value={r.id}>فرعية من: {r.name}</option>)}
            </Select>
            <Button type="submit" disabled={pending}><Plus className="h-4 w-4" /> إضافة</Button>
          </form>
        </CardContent>
      </Card>

      {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">لا توجد فئات بعد.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((c) => (
                <li key={c.id} className={`flex flex-wrap items-center gap-2 p-3 ${c.parent_id ? "ps-10" : ""}`}>
                  {editing === c.id ? (
                    <>
                      <Input className="h-9 max-w-xs" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="الاسم" />
                      <Select className="h-9 max-w-48" value={draft.parent_id} onChange={(e) => setDraft({ ...draft, parent_id: e.target.value })} aria-label="الأصل">
                        <option value="">فئة رئيسية</option>
                        {roots.filter((r) => r.id !== c.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </Select>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> ظاهرة
                      </label>
                      <div className="ms-auto flex gap-1">
                        <Button size="icon" variant="ghost" aria-label="حفظ" disabled={pending}
                          onClick={() => run(() => updateCategory(c.id, { name: draft.name, parent_id: draft.parent_id || null, is_active: draft.is_active }), () => setEditing(null))}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="إلغاء" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{c.name}</span>
                      {!c.is_active && <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">مخفية</span>}
                      <div className="ms-auto flex gap-1">
                        <Button size="icon" variant="ghost" aria-label="تحريك لأعلى" disabled={pending} onClick={() => run(() => moveCategory(c.id, "up"))}><ArrowUp className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="تحريك لأسفل" disabled={pending} onClick={() => run(() => moveCategory(c.id, "down"))}><ArrowDown className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="تعديل"
                          onClick={() => { setEditing(c.id); setDraft({ name: c.name, parent_id: c.parent_id ?? "", is_active: c.is_active }); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="حذف" disabled={pending}
                          onClick={() => confirm(`حذف الفئة "${c.name}"؟ المنتجات التابعة لها لن تُحذف وستصبح بدون فئة.`) && run(() => deleteCategory(c.id))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
