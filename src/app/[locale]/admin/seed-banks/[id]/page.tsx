"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
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

interface Translation {
  locale: string;
  name: string;
  description: string;
}

interface SeedBank {
  id: string;
  slug: string;
  logo_url: string;
  website: string;
  seed_bank_translations: Translation[];
}

export default function EditSeedBankPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formSlug, setFormSlug] = useState("");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formName, setFormName] = useState("");
  const { isDirty } = useDirtySnapshot(
    { formSlug, formLogoUrl, formWebsite, formName },
    !loading
  );

  useAdminSaveRegistration({
    label: "Salvar",
    canSave: Boolean(formSlug),
    saving,
    dirty: isDirty,
    onSave: handleSave,
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/seed-banks");
        if (res.ok) {
          const data: SeedBank[] = await res.json();
          const sb = data.find((s) => s.id === id);
          if (sb) {
            setFormSlug(sb.slug);
            setFormLogoUrl(sb.logo_url);
            setFormWebsite(sb.website);
            setFormName(
              sb.seed_bank_translations.find((t) => t.locale === "pt")?.name ??
              sb.seed_bank_translations[0]?.name ??
              ""
            );
          }
        }
      } catch {
        toast.error("Não foi possível carregar os dados.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/seed-banks/${id}`, {
        method: "PUT",
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
        toast.success("Seed bank salvo");
        router.push(`/${locale}/admin/seed-banks`);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Falha ao salvar o seed bank.");
      }
    } catch {
      toast.error("Falha ao salvar o seed bank.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/admin/seed-banks`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Editar Seed Bank</h1>
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
