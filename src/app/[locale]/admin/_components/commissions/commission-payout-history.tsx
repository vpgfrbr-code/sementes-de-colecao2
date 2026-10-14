"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveOverlay } from "../ui/responsive-overlay";
import { DualPrice } from "./dual-price";

type Payout = {
  id: string;
  reseller_user_id: string | null;
  coupon_id: string | null;
  reseller_name: string;
  reseller_email: string;
  total_cents: number;
  method: "pix" | "transferencia" | "dinheiro" | "outro";
  reference: string;
  notes: string;
  paid_at: string;
  created_by: string;
  created_at: string;
  order_count: number;
};

const METHOD_LABEL: Record<Payout["method"], string> = {
  pix: "PIX",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
  outro: "Outro",
};

interface CommissionPayoutHistoryProps {
  from: string;
  to: string;
  refreshKey: number;
  onChanged: () => void;
}

export function CommissionPayoutHistory({
  from,
  to,
  refreshKey,
  onChanged,
}: CommissionPayoutHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [reverseTarget, setReverseTarget] = useState<string | null>(null);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin/commission-payouts?${params}`);
      if (!res.ok) {
        toast.error("Erro ao carregar histórico");
        setPayouts([]);
        return;
      }
      const data = await res.json();
      setPayouts((data.payouts ?? []) as Payout[]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void fetchPayouts();
  }, [fetchPayouts, refreshKey]);

  async function reverse(id: string) {
    setReversingId(id);
    try {
      const res = await fetch(`/api/admin/commission-payouts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erro ao estornar");
        return;
      }
      toast.success("Pagamento estornado");
      setReverseTarget(null);
      await fetchPayouts();
      onChanged();
    } finally {
      setReversingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico de Pagamentos</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Nenhum pagamento registrado no período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3 font-medium text-muted-foreground">
                    Data
                  </th>
                  <th className="p-3 font-medium text-muted-foreground">
                    Revendedor
                  </th>
                  <th className="p-3 font-medium text-muted-foreground text-right">
                    Pedidos
                  </th>
                  <th className="p-3 font-medium text-muted-foreground text-right">
                    Valor
                  </th>
                  <th className="p-3 font-medium text-muted-foreground">
                    Método
                  </th>
                  <th className="p-3 font-medium text-muted-foreground">
                    Referência
                  </th>
                  <th className="p-3 font-medium text-muted-foreground text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(p.paid_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{p.reseller_name}</p>
                      {p.reseller_email && (
                        <p className="text-xs text-muted-foreground">
                          {p.reseller_email}
                        </p>
                      )}
                      {p.notes && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          {p.notes}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-right">{p.order_count}</td>
                    <td className="p-3 text-right font-medium text-primary">
                      <DualPrice usdCents={p.total_cents} />
                    </td>
                    <td className="p-3">{METHOD_LABEL[p.method]}</td>
                    <td className="p-3 text-xs">
                      {p.reference || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReverseTarget(p.id)}
                        disabled={reversingId === p.id}
                      >
                        {reversingId === p.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <ResponsiveOverlay
        open={reverseTarget !== null}
        onOpenChange={(open) => !open && setReverseTarget(null)}
        title="Estornar pagamento"
        description="Os pedidos voltarão ao estado pendente de comissão."
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 sm:h-10"
              onClick={() => setReverseTarget(null)}
              disabled={reversingId !== null}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="h-11 sm:h-10"
              onClick={() => reverseTarget && reverse(reverseTarget)}
              disabled={reversingId !== null}
            >
              {reversingId !== null ? "Estornando…" : "Estornar"}
            </Button>
          </div>
        }
      >
        <span className="sr-only">Confirmação de estorno</span>
      </ResponsiveOverlay>
    </Card>
  );
}
