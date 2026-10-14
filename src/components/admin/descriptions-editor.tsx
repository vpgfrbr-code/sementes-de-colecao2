"use client";

import { Check, Languages } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DescriptionLocale = "pt" | "en" | "es";

const LOCALE_LABELS: Record<DescriptionLocale, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
};

interface DescriptionsEditorProps {
  value: Record<DescriptionLocale, string>;
  onChange: (next: Record<DescriptionLocale, string>) => void;
  canonicalLocale?: DescriptionLocale;
  rows?: number;
  /** Optional id prefix to keep ARIA ids unique when multiple editors render on the same page. */
  idPrefix?: string;
}

const ORDER: DescriptionLocale[] = ["pt", "en", "es"];

export function DescriptionsEditor({
  value,
  onChange,
  canonicalLocale = "pt",
  rows = 5,
  idPrefix = "desc",
}: DescriptionsEditorProps) {
  const filledCount = ORDER.filter((l) => value[l]?.trim()).length;
  const canonicalText = value[canonicalLocale] ?? "";

  function handleChange(locale: DescriptionLocale, text: string) {
    onChange({ ...value, [locale]: text });
  }

  function copyFromCanonical(target: DescriptionLocale) {
    if (!canonicalText.trim()) return;
    onChange({ ...value, [target]: canonicalText });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Descrição</Label>
        <span className="text-xs text-muted-foreground">
          {filledCount}/{ORDER.length} idiomas preenchidos
        </span>
      </div>

      <Tabs defaultValue={canonicalLocale} className="gap-3">
        <TabsList className="w-full">
          {ORDER.map((loc) => {
            const filled = Boolean(value[loc]?.trim());
            return (
              <TabsTrigger key={loc} value={loc} className="gap-1.5">
                <span>{LOCALE_LABELS[loc]}</span>
                {filled ? (
                  <Check
                    aria-label="preenchido"
                    className="size-3.5 text-emerald-600"
                  />
                ) : (
                  <span
                    aria-label="vazio"
                    className={cn(
                      "size-1.5 rounded-full",
                      loc === canonicalLocale
                        ? "bg-amber-500"
                        : "bg-muted-foreground/40"
                    )}
                  />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ORDER.map((loc) => {
          const isCanonical = loc === canonicalLocale;
          const inputId = `${idPrefix}-${loc}`;
          return (
            <TabsContent key={loc} value={loc} className="space-y-2">
              <Textarea
                id={inputId}
                value={value[loc] ?? ""}
                onChange={(e) => handleChange(loc, e.target.value)}
                rows={rows}
                placeholder={
                  isCanonical
                    ? "Descrição do produto em português…"
                    : `Descrição em ${LOCALE_LABELS[loc]} (opcional — fica vazio se não preencher)`
                }
              />
              {!isCanonical && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Opcional. Use o botão ao lado para copiar do português.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyFromCanonical(loc)}
                    disabled={!canonicalText.trim()}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Languages className="size-3.5" />
                    Copiar do português
                  </Button>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
