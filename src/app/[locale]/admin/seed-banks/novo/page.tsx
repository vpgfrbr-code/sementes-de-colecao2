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
import { MediaManager } from "@/components/admin/media-manager";
import {
  useAdminSaveRegistration,
  useDirtySnapshot,
} from "../../_components/admin-save-context";

const LOCALES = ["pt", "en", "es"] as const;

export default function NewSeedBankPage() {
  const locale = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formSlug, setFormSlug] = useState("");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formName, setFormName] = useState("");
  const { isDirty } = useDirtySnapshot({
    formSlug,
    formLogoUrl,
    formWebsite,
    formName,
  });

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
      const res = await fetch("/api/admin/seed-banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: formSlug,
          logo_url: formLogoUrl,
          website: formWebsite,
          translations: formName.trim()
            ? LOCALES.map((l) => ({ locale: l, name: formName.trim(), description: "" }))
            : [],
        }),
      });
      if (res.ok) {
        toast.success("Seed bank criado");
        router.push(`/${locale}/admin/seed-banks`);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Falha ao criar o seed bank.");
      }
    } catch {
      toast.error("Falha ao criar o seed bank.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/admin/seed-banks`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Novo Seed Bank</h1>
      </div>

      <Card>
        <CardContent className="space-y-6 p-4 sm:p-6">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Barney Farm"
            />
          </div>

          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              placeholder="barney-farm"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo</Label>
            <MediaManager
              value={formLogoUrl ? [formLogoUrl] : []}
              onChange={(urls) => setFormLogoUrl(urls[0] ?? "")}
              folder="seed-banks"
            />
          </div>

          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              value={formWebsite}
              onChange={(e) => setFormWebsite(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
