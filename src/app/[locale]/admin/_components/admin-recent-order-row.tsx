"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Ban, Check, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentProofViewer } from "@/components/payment-proof-viewer";
import { runMutation } from "@/lib/admin-mutation";
import { formatPrice } from "@/lib/format-price";
import { ResponsiveOverlay } from "./ui/responsive-overlay";

const CANCELLABLE_STATUSES = ["waiting_payment", "payment_reported", "approved"];
const APPROVABLE_STATUSES = ["waiting_payment", "payment_reported"];

const STATUS_LABELS: Record<string, string> = {
  waiting_payment: "Aguardando Pagamento",
  payment_reported: "Pagamento Reportado",
  approved: "Aprovado",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  waiting_payment: "text-amber-600",
  payment_reported: "text-blue-600",
  approved: "text-green-600",
  shipped: "text-green-700",
  delivered: "text-green-800",
  cancelled: "text-destructive",
};

interface AdminRecentOrderRowProps {
  order: {
    id: string;
    status: string;
    total_cents: number;
    total_brl_cents: number | null;
    customer_name: string | null;
    guest_email: string | null;
    payment_proof_path?: string | null;
  };
}

export function AdminRecentOrderRow({ order }: AdminRecentOrderRowProps) {
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [running, setRunning] = useState(false);
  const [confirm, setConfirm] = useState<"approve" | "cancel" | null>(null);

  async function transition(newStatus: string, successMessage: string) {
    setRunning(true);
    const { ok } = await runMutation({
      url: `/api/admin/orders/${order.id}`,
      method: "PATCH",
      body: { status: newStatus },
      successMessage,
      errorMessage: "Falha ao atualizar o pedido.",
      onSuccess: () => {
        setStatus(newStatus);
        router.refresh();
      },
    });
    if (ok) setConfirm(null);
    setRunning(false);
  }

  const canApprove = APPROVABLE_STATUSES.includes(status);
  const canCancel = CANCELLABLE_STATUSES.includes(status);

  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
      <Link
        href={`/${locale}/admin/pedidos/${order.id}`}
        className="group flex min-w-0 flex-1 items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium group-hover:underline">
            #{order.id.slice(0, 8)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {order.customer_name || order.guest_email || "—"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-medium">
            {formatPrice(order.total_cents, "pt")}
          </p>
          {order.total_brl_cents != null && (
            <p className="font-mono text-xs text-muted-foreground">
              {formatPrice(order.total_brl_cents, "pt", "BRL")}
            </p>
          )}
          <p
            className={`text-xs font-medium ${STATUS_COLORS[status] ?? "text-muted-foreground"}`}
          >
            {STATUS_LABELS[status] ?? status}
          </p>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        {canApprove && (
          <Button
            size="icon"
            variant="outline"
            className="size-10 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950 md:size-8"
            aria-label="Aprovar pedido"
            disabled={running}
            onClick={() => setConfirm("approve")}
          >
            <Check className="size-4" />
          </Button>
        )}
        {canCancel && (
          <Button
            size="icon"
            variant="outline"
            className="size-10 text-destructive hover:bg-destructive/10 hover:text-destructive md:size-8"
            aria-label="Cancelar pedido"
            disabled={running}
            onClick={() => setConfirm("cancel")}
          >
            <Ban className="size-4" />
          </Button>
        )}
        <Link
          href={`/${locale}/admin/pedidos/${order.id}`}
          aria-label="Ver detalhes do pedido"
          className="flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground md:size-8"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Aprovação dispara e-mail ao cliente; cancelamento devolve estoque —
          ambos confirmam antes. */}
      <ResponsiveOverlay
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={confirm === "approve" ? "Aprovar pagamento" : "Cancelar pedido"}
        description={`Pedido #${order.id.slice(0, 8)} — ${
          order.customer_name || order.guest_email || "cliente"
        }`}
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-11 sm:h-10"
              onClick={() => setConfirm(null)}
              disabled={running}
            >
              Voltar
            </Button>
            <Button
              variant={confirm === "cancel" ? "destructive" : "default"}
              className="h-11 gap-2 sm:h-10"
              disabled={running}
              onClick={() =>
                confirm === "approve"
                  ? transition("approved", `Pedido #${order.id.slice(0, 8)} aprovado`)
                  : transition("cancelled", "Pedido cancelado")
              }
            >
              {running ? (
                <Loader2 className="size-4 animate-spin" />
              ) : confirm === "approve" ? (
                <Check className="size-4" />
              ) : (
                <Ban className="size-4" />
              )}
              {confirm === "approve" ? "Confirmar aprovação" : "Cancelar pedido"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono font-medium">#{order.id.slice(0, 8)}</span>
              <span className="font-mono text-base font-bold tabular-nums">
                {order.total_brl_cents != null
                  ? formatPrice(order.total_brl_cents, "pt", "BRL")
                  : formatPrice(order.total_cents, "pt")}
              </span>
            </div>
          </div>
          {confirm === "approve" && order.payment_proof_path && (
            <PaymentProofViewer
              orderId={order.id}
              proofPath={order.payment_proof_path}
              endpoint="admin"
              autoLoad
              inlinePreview
              triggerLabel="Ampliar comprovante"
            />
          )}
          <p className="text-xs text-muted-foreground">
            {confirm === "approve"
              ? "Ao confirmar, o cliente recebe o e-mail de confirmação do pedido."
              : "O estoque reservado volta para os produtos e a reserva do cupom é liberada."}
          </p>
        </div>
      </ResponsiveOverlay>
    </div>
  );
}
