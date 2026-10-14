"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

/**
 * Superadmin toggle for the rich "Ciência do Fenótipo" card on the product
 * detail page. When off, the same data is rendered as a plain 2-column
 * label/value table.
 */
export function StrainScienceCardSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/strain-science-card", {
        cache: "no-store",
      });
      if (res.ok) {
        const data: { enabled: boolean } = await res.json();
        setEnabled(!!data.enabled);
      }
    } finally {
      setLoading(false);
    }
  }

  async function save(next: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/strain-science-card", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (res.ok) {
        setEnabled(next);
        setMessage(
          next
            ? "Card avançado ativado."
            : "Tabela simples ativada."
        );
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error ?? "Falha ao salvar.");
      }
    } catch {
      setMessage("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-semibold tracking-tight">
        Ciência do Fenótipo (página de produto)
      </h2>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="size-4" />
            <span className="font-mono text-sm font-bold">
              Apresentação dos dados de cepa
            </span>
            <Badge
              variant={enabled ? "default" : "outline"}
              className="text-xs"
            >
              {enabled ? "Card avançado" : "Tabela simples"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Controla como banco de sementes, tipo, floração, THC, CBD, genética
            e perfil de terpenos aparecem em <strong>/produto/[slug]</strong>.
            Card avançado: visual industrial com monograma, árvore de
            genética e barras animadas. Tabela simples: 2 colunas
            (campo / valor) sem ilustrações.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Switch
              checked={enabled}
              onCheckedChange={(v) => void save(!!v)}
              disabled={loading || saving}
              id="strain-science-toggle"
            />
            <label
              htmlFor="strain-science-toggle"
              className="cursor-pointer text-sm"
            >
              {enabled
                ? "Exibindo card avançado"
                : "Exibindo tabela simples"}
            </label>
            {(loading || saving) && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            {message && (
              <span className="text-xs text-muted-foreground">{message}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
