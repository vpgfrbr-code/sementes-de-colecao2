"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CommissionPayoutDialog } from "./commission-payout-dialog";
import { DualPrice } from "./dual-price";
import { formatPrice } from "@/lib/format-price";

interface PayCommissionButtonProps {
  resellerName: string;
  resellerUserId: string | null;
  /** Optional. When provided, restricts the payout to this coupon. */
  couponId?: string | null;
  couponCode?: string;
  /** Visual variant of the wrapper. */
  variant?: "compact" | "full";
  /** Called after a successful payment (use to refresh parent data). */
  onPaid?: () => void;
  /** Bumping this value forces a refetch (e.g. after a parent action). */
  refreshKey?: number;
}

/**
 * Self-contained button: fetches pending commission for the given reseller/
 * coupon, shows the amount, and opens the payout dialog when clicked.
 *
 * - "compact": just a small button with a badge of pending value.
 * - "full":   button + inline DualPrice and label, suitable for headers.
 */
export function PayCommissionButton({
  resellerName,
  resellerUserId,
  couponId = null,
  couponCode = "",
  variant = "compact",
  onPaid,
  refreshKey = 0,
}: PayCommissionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [pendingCents, setPendingCents] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPending = useCallback(async () => {
    if (!resellerUserId && !couponId) {
      setPendingCents(0);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (resellerUserId) params.set("reseller_user_id", resellerUserId);
      if (couponId && !resellerUserId) params.set("coupon_id", couponId);
      const res = await fetch(
        `/api/admin/commission-payouts/pending?${params}`
      );
      if (!res.ok) {
        setPendingCents(0);
        return;
      }
      const data = await res.json();
      setPendingCents(data.total_cents ?? 0);
    } finally {
      setLoading(false);
    }
  }, [resellerUserId, couponId]);

  useEffect(() => {
    void fetchPending();
  }, [fetchPending, refreshKey]);

  const disabled = loading || pendingCents <= 0;

  if (variant === "full") {
    return (
      <>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">
              Comissão pendente
            </span>
            {loading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <DualPrice usdCents={pendingCents} align="right" />
            )}
          </div>
          <Button
            variant="default"
            disabled={disabled}
            onClick={() => setDialogOpen(true)}
          >
            <Wallet className="size-4 mr-2" />
            Pagar comissão
          </Button>
        </div>
        <CommissionPayoutDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          resellerName={resellerName}
          couponCode={couponCode}
          resellerUserId={resellerUserId}
          couponId={couponId}
          onSuccess={() => {
            void fetchPending();
            onPaid?.();
          }}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setDialogOpen(true)}
        className="gap-1.5"
      >
        <Wallet className="size-3.5" />
        Pagar
        {pendingCents > 0 && (
          <Badge variant="secondary" className="ml-1 font-mono text-[10px]">
            {formatPrice(pendingCents, "pt")}
          </Badge>
        )}
      </Button>
      <CommissionPayoutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resellerName={resellerName}
        couponCode={couponCode}
        resellerUserId={resellerUserId}
        couponId={couponId}
        onSuccess={() => {
          void fetchPending();
          onPaid?.();
        }}
      />
    </>
  );
}
