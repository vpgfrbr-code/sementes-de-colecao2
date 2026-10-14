"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  useAdminSaveRegistration,
  useDirtySnapshot,
} from "../../_components/admin-save-context";

const LOCALES = ["pt", "en", "es"] as const;
const LOCALE_LABELS = { pt: "Português", en: "English", es: "Español" };

export default function NewCategoryPage() {
  const locale = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formSlug, setFormSlug] = useState("");
  const [formTranslations, setFormTranslations] = useState(
    LOCALES.map((l) => ({ locale: l, name: "", description: "" }))
  );
  const { isDirty } = useDirtySnapshot({ formSlug, formTranslations });

  useAdminSaveRegistration({
    label: "Salvar",
    canSave: Boolean(formSlug),
    saving,
    dirty: isDirty,
    onSave: handleSave,
  });

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: formSlug,
          translations: formTranslations.filter((t) => t.name.trim()),
        }),
      });
      if (res.ok) {
        toast.success("Categoria criada");
        router.push(`/${locale}/admin/categorias`);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Falha ao criar a categoria.");
      }
    } catch {
      toast.error("Falha ao criar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/admin/categorias`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nova Categoria</h1>
      </div>

      <Card>
        <CardContent className="space-y-6 p-4 sm:p-6">
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              placeholder="minha-categoria"
            />
          </div>

          <Separator />

          {formTranslations.map((t, idx) => (
            <div key={t.locale} className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {LOCALE_LABELS[t.locale as keyof typeof LOCALE_LABELS]}
              </Label>
              <Input
                value={t.name}
                onChange={(e) =>
                  setFormTranslations((prev) =>
                    prev.map((tr, i) =>
                      i === idx ? { ...tr, name: e.target.value } : tr
                    )
                  )
                }
                placeholder="Nome"
              />
              {idx < formTranslations.length - 1 && <Separator />}
            </div>
          ))}

        </CardContent>
      </Card>
    </div>
  );
}
