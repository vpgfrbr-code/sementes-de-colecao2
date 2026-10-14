"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useLocale } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ResellerAccountSelect } from "../_components/reseller-account-select";
import {
  useAdminSaveRegistration,
  useDirtySnapshot,
} from "../../_components/admin-save-context";

const EMPTY_FORM = {
  code: "",
  type: "percentage" as "percentage" | "fixed",
  value: 0,
  min_order_cents: 0,
  apply_to_shipping: false,
  max_uses: "",
  max_uses_per_user: "",
  reseller_user_id: "",
  commission_percent: "",
  active: true,
  expires_at: "",
  persistence_days: "30",
};

export default function NewCouponPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user } = useUser();
  const isSuperAdmin =
    (user?.publicMetadata as { role?: string } | undefined)?.role ===
    "superadmin";
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [copied, setCopied] = useState(false);
  const { isDirty } = useDirtySnapshot(form);

  const shareLink =
    typeof window !== "undefined" && form.code
      ? `${window.location.origin}/?ref=${form.code}`
      : "";

  function copyToClipboard() {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useAdminSaveRegistration({
    label: "Salvar",
    canSave: Boolean(form.code) && typeof form.value === "number" && form.value >= 0,
    saving,
    dirty: isDirty,
    onSave: handleSave,
  });

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        type: form.type,
        value: form.value,
        min_order_cents: form.min_order_cents,
        apply_to_shipping: form.apply_to_shipping,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        reseller_user_id: form.reseller_user_id || null,
        commission_percent: form.commission_percent
          ? parseFloat(form.commission_percent)
          : null,
        active: form.active,
        expires_at: form.expires_at
          ? new Date(form.expires_at).toISOString()
          : null,
        // Cookie persistence is superadmin-only; omit it otherwise so the
        // server applies the default window.
        ...(isSuperAdmin
          ? {
              persistence_days: form.persistence_days
                ? parseInt(form.persistence_days)
                : 30,
            }
          : {}),
      };
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Cupom criado");
        router.push(`/${locale}/admin/cupons`);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Falha ao criar o cupom.");
      }
    } catch {
      toast.error("Falha ao criar o cupom.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/admin/cupons`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Novo Cupom</h1>
      </div>

      <Card>
        <CardContent className="space-y-6 p-4 sm:p-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="SUMMER10"
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as "percentage" | "fixed" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (centavos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Link Compartilhável (rastreia indicação via cookies)</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareLink}
                className="bg-muted font-mono text-xs"
                placeholder="Preencha o código do cupom primeiro"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!shareLink}
                onClick={copyToClipboard}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Valor{" "}
                {form.type === "percentage" ? "(%)" : "(centavos USD)"}
              </Label>
              <Input
                type="number"
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    value: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Pedido Mínimo (US$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.min_order_cents ? (form.min_order_cents / 100).toFixed(2) : ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    min_order_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                  }))
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Máximo de Usos Total (vazio = ilimitado)</Label>
              <Input
                type="number"
                value={form.max_uses}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_uses: e.target.value }))
                }
                placeholder="Ilimitado"
              />
            </div>
            <div className="space-y-2">
              <Label>Máximo de Usos por Conta (vazio = ilimitado)</Label>
              <Input
                type="number"
                value={form.max_uses_per_user}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_uses_per_user: e.target.value }))
                }
                placeholder="Ilimitado"
              />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Expira em</Label>
              <Input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expires_at: e.target.value }))
                }
              />
              {form.expires_at && (() => {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const local = new Date(form.expires_at);
                const utc = local.toISOString().replace("T", " ").slice(0, 16);
                const localStr = local.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: tz });
                return (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe className="size-3" />
                    {localStr} ({tz}) — {utc} UTC
                  </p>
                );
              })()}
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>Persistência do cookie (dias)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={form.persistence_days}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, persistence_days: e.target.value }))
                  }
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">
                  Por quanto tempo o cupom fica salvo no navegador (auto-aplicação
                  no checkout e atribuição ao revendedor). Padrão: 30 dias.
                  Apenas superadmin.
                </p>
              </div>
            )}
          </div>

          <Separator />

          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Revendedor (opcional)
          </p>

          <ResellerAccountSelect
            value={form.reseller_user_id}
            onChange={(reseller_user_id) =>
              setForm((f) => ({
                ...f,
                reseller_user_id,
              }))
            }
          />

          <div className="space-y-2">
            <Label>Comissão (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.commission_percent}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  commission_percent: e.target.value,
                }))
              }
              placeholder="15.00"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="coupon-apply-shipping"
              checked={form.apply_to_shipping}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, apply_to_shipping: !!checked }))
              }
            />
            <Label htmlFor="coupon-apply-shipping">Aplicar desconto no frete também</Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="coupon-active"
              checked={form.active}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, active: !!checked }))
              }
            />
            <Label htmlFor="coupon-active">Ativo</Label>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
