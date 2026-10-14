"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/format-price";
import { ResponsiveOverlay } from "../ui/responsive-overlay";
import { DualPrice } from "./dual-price";

type PendingOrder = {
  id: string;
  customer_name: string | null;
  total_cents: number;
  subtotal_cents: number;
  discount_cents: number;
  status: string;
  created_at: string;
  commission_percent: number;
  commission_cents: number;
  attribution: "manual" | "coupon";
};

interface CommissionPayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resellerName: string;
  couponCode: string;
  resellerUserId: string | null;
  couponId: string | null;
  onSuccess: () => void;
}

function statusLabel(s: string) {
  switch (s) {
    case "waiting_payment":
      return "Aguardando";
    case "approved":
      return "Aprovado";
    case "shipped":
      return "Enviado";
    case "delivered":
      return "Entregue";
    default:
      return s;
  }
}

export function CommissionPayoutDialog({
  open,
  onOpenChange,
  resellerName,
  couponCode,
  resellerUserId,
  couponId,
  onSuccess,
}: CommissionPayoutDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paidAt, setPaidAt] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [method, setMethod] = useState<
    "pix" | "transferencia" | "dinheiro" | "outro"
  >("pix");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setReference("");
    setNotes("");
    setMethod("pix");
    setPaidAt(new Date().toISOString().slice(0, 10));
    void fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resellerUserId, couponId]);

  async function fetchPending() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (resellerUserId) params.set("reseller_user_id", resellerUserId);
      if (couponId && !resellerUserId) params.set("coupon_id", couponId);
      const res = await fetch(
        `/api/admin/commission-payouts/pending?${params}`
      );
      if (!res.ok) {
        toast.error("Erro ao carregar comissões pendentes");
        setPendingOrders([]);
        return;
      }
      const data = await res.json();
      const list = (data.orders ?? []) as PendingOrder[];
      setPendingOrders(list);
      // Pre-select all by default
      setSelected(new Set(list.map((o) => o.id)));
    } finally {
      setLoading(false);
    }
  }

  function toggleAll() {
    if (selected.size === pendingOrders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingOrders.map((o) => o.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedOrders = pendingOrders.filter((o) => selected.has(o.id));
  const totalSelected = selectedOrders.reduce(
    (s, o) => s + o.commission_cents,
    0
  );

  async function submit() {
    if (selected.size === 0) {
      toast.error("Selecione ao menos um pedido");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        order_ids: Array.from(selected),
        paid_at: paidAt,
        method,
        reference,
        notes,
      };
      if (resellerUserId) body.reseller_user_id = resellerUserId;
      if (couponId && !resellerUserId) body.coupon_id = couponId;

      const res = await fetch("/api/admin/commission-payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao registrar pagamento");
        return;
      }
      const data = await res.json();
      toast.success(
        `Pagamento registrado: ${formatPrice(data.total_cents, "pt")}`
      );
      onOpenChange(false);
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title="Pagar comissão"
      description={
        couponCode && couponCode !== "—"
          ? `${resellerName} · cupom ${couponCode}`
          : resellerName
      }
      dialogClassName="sm:max-w-3xl"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="h-11 sm:h-10"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            className="h-11 sm:h-10"
            onClick={submit}
            disabled={
              submitting ||
              loading ||
              selected.size === 0 ||
              pendingOrders.length === 0
            }
          >
            {submitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Confirmar pagamento
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : pendingOrders.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Não há comissões pendentes para este revendedor.
          </div>
        ) : (
          <>
            {/* Pending orders table */}
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">
                      <Checkbox
                        checked={
                          selected.size > 0 &&
                          selected.size === pendingOrders.length
                        }
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="p-2 text-left font-medium text-muted-foreground">
                      Pedido
                    </th>
                    <th className="p-2 text-left font-medium text-muted-foreground">
                      Cliente
                    </th>
                    <th className="p-2 text-right font-medium text-muted-foreground">
                      Total
                    </th>
                    <th className="p-2 text-right font-medium text-muted-foreground">
                      Comissão
                    </th>
                    <th className="p-2 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="cursor-pointer border-t transition-colors active:bg-secondary/50"
                      onClick={() => toggleOne(o.id)}
                    >
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(o.id)}
                          onCheckedChange={() => toggleOne(o.id)}
                          className="size-5"
                        />
                      </td>
                      <td className="p-2 font-mono text-xs">
                        {o.id.slice(0, 8)}
                        <div className="text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </td>
                      <td className="p-2">
                        {o.customer_name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {o.attribution === "manual" && (
                          <div className="text-[10px] text-muted-foreground uppercase">
                            atribuição manual
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <DualPrice usdCents={o.total_cents} />
                      </td>
                      <td className="p-2 text-right font-medium text-primary">
                        <DualPrice usdCents={o.commission_cents} />
                        <div className="text-[10px] text-muted-foreground">
                          {o.commission_percent}%
                        </div>
                      </td>
                      <td className="p-2 text-xs">{statusLabel(o.status)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-medium">
                    <td colSpan={4} className="p-2 text-right">
                      Total selecionado:
                    </td>
                    <td className="p-2 text-right text-primary">
                      <DualPrice usdCents={totalSelected} />
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Form */}
            <div className="grid gap-4 sm:grid-cols-2 mt-2">
              <div className="space-y-2">
                <Label>Data do pagamento</Label>
                <Input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Método</Label>
                <Select
                  value={method}
                  onValueChange={(v) =>
                    setMethod(
                      v as "pix" | "transferencia" | "dinheiro" | "outro"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transferencia">
                      Transferência
                    </SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Referência / Comprovante</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex.: ID da transação PIX, número do comprovante"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notas</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </ResponsiveOverlay>
  );
}
