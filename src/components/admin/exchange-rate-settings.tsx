"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "fixed" | "dynamic";
type Source = "fixed" | "dynamic" | "fallback";

interface Effective {
  rate: number;
  baseRate: number | null;
  source: Source;
  liveTimestamp: string | null;
}

interface ApiResponse {
  config: { mode: Mode; fixed_rate: number; markup_percent: number };
  effective: Effective;
}

const MARKUP_MAX = 50;

/**
 * Superadmin UI to control how USD prices are converted to BRL across the
 * storefront and the checkout. The same effective rate that this preview
 * shows is what PriceDisplay and /api/checkout will apply, guaranteeing
 * the customer is charged exactly the BRL amount they saw.
 */
export function ExchangeRateSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("dynamic");
  const [fixedRate, setFixedRate] = useState<number>(5.5);
  const [markupPercent, setMarkupPercent] = useState<number>(10);
  const [effective, setEffective] = useState<Effective | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/exchange-rate", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: ApiResponse = await res.json();
      setMode(data.config.mode);
      setFixedRate(data.config.fixed_rate);
      setMarkupPercent(data.config.markup_percent);
      setEffective(data.effective);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!Number.isFinite(fixedRate) || fixedRate <= 0) {
      setMessage("Taxa fixa inválida.");
      return;
    }
    if (
      !Number.isFinite(markupPercent) ||
      markupPercent < 0 ||
      markupPercent > MARKUP_MAX
    ) {
      setMessage(`Markup deve estar entre 0% e ${MARKUP_MAX}%.`);
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/exchange-rate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          fixed_rate: fixedRate,
          markup_percent: markupPercent,
        }),
      });
      if (res.ok) {
        const data: ApiResponse = await res.json();
        setEffective(data.effective);
        setMessage("Configuração salva. Preço público atualizado.");
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

  const previewRate =
    mode === "fixed"
      ? fixedRate
      : effective?.baseRate
        ? effective.baseRate * (1 + markupPercent / 100)
        : null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Câmbio USD → BRL
        </h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="mr-1.5 size-3.5" />
          Atualizar cotação
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold">
              Conversão de preços
            </span>
            <Badge variant="outline" className="text-xs">
              {mode === "fixed" ? "Taxa fixa" : "Dinâmica + markup"}
            </Badge>
            {effective && (
              <Badge
                variant={
                  effective.source === "fallback" ? "destructive" : "default"
                }
                className="text-xs"
              >
                Fonte:{" "}
                {effective.source === "dynamic"
                  ? "API ao vivo"
                  : effective.source === "fixed"
                    ? "Travada"
                    : "Fallback (API offline)"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Ambos a vitrine (preços em produtos) e o checkout usam esta mesma
            taxa, então o valor exibido em BRL é exatamente o que o cliente
            paga. No modo dinâmico, a cotação ao vivo (USD-BRL) recebe o
            markup configurado. Se a API falhar, cai para a taxa fixa.
          </p>

          <div className="grid gap-4 sm:grid-cols-[180px_180px_180px_auto]">
            <div className="space-y-2">
              <Label className="text-sm">Modo</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === "dynamic" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("dynamic")}
                >
                  Dinâmica
                </Button>
                <Button
                  type="button"
                  variant={mode === "fixed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("fixed")}
                >
                  Fixa
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">
                Taxa fixa (R$ por US$ 1)
              </Label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={fixedRate}
                onChange={(e) => setFixedRate(Number(e.target.value))}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Também usada como fallback no modo dinâmico.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Markup (%)</Label>
              <Input
                type="number"
                min={0}
                max={MARKUP_MAX}
                step={0.1}
                value={markupPercent}
                onChange={(e) => setMarkupPercent(Number(e.target.value))}
                disabled={mode === "fixed"}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Aplicado sobre a cotação ao vivo (modo dinâmico).
              </p>
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 font-mono text-xs">
            <div className="grid gap-1 sm:grid-cols-3">
              <div>
                <span className="text-muted-foreground">Cotação ao vivo:</span>{" "}
                <span className="font-bold">
                  {effective?.baseRate
                    ? `R$ ${effective.baseRate.toFixed(4)}`
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Taxa efetiva:</span>{" "}
                <span className="font-bold">
                  {previewRate ? `R$ ${previewRate.toFixed(4)}` : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Cotada em:</span>{" "}
                <span>
                  {effective?.liveTimestamp
                    ? new Date(effective.liveTimestamp).toLocaleString("pt-BR")
                    : "—"}
                </span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Exemplo: produto de US$ 100 →{" "}
              <span className="font-bold">
                {previewRate
                  ? `R$ ${(100 * previewRate).toFixed(2)}`
                  : "—"}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={save} disabled={saving || loading}>
              {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Salvar configuração
            </Button>
            {message && (
              <span className="text-xs text-muted-foreground">{message}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
