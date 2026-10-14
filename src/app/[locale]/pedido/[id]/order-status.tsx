"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, Clock, Copy, ExternalLink, HomeIcon, Loader2, QrCode, TruckIcon, Upload, UserPlus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeUp, ScaleIn } from "@/components/motion";
import { PixQrCode } from "@/components/pix-qr-code";
import { PaymentProofUpload } from "@/components/payment-proof-upload";
import { PaymentProofViewer } from "@/components/payment-proof-viewer";
import { OrderTicket } from "@/components/order-ticket";
import { OrderConfirmation } from "./order-confirmation";
import { getTrackingUrl } from "@/lib/tracking-url";
import { OrderTimeline } from "@/components/order-timeline";

interface OrderItem {
  id: string;
  name: string;
  variantLabel: string;
  quantity: number;
  unitPriceCents: number;
  image: string | null;
}

interface OrderStatusProps {
  orderId: string;
  initialStatus: string;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  totalBrlCents: number | null;
  pixBrCode: string | null;
  pixExpiresAt: string | null;
  guestEmail: string | null;
  customerName: string | null;
  address: Record<string, string> | null;
  items: OrderItem[];
  createdAt: string;
  customerTzOffset?: number | null;
  locale: string;
  hasPaymentProof?: boolean;
  paymentProofPath?: string | null;
  trackingCode?: string | null;
  shippingCarrier?: string | null;
  customerCpf?: string | null;
  couponCode?: string | null;
  mapUrl?: string | null;
}

const POLL_INTERVAL = 5000;



export function OrderStatus({
  orderId,
  initialStatus,
  totalCents,
  subtotalCents,
  discountCents,
  totalBrlCents,
  pixBrCode,
  pixExpiresAt,
  guestEmail,
  customerName,
  address,
  items,
  createdAt,
  customerTzOffset = null,
  locale,
  hasPaymentProof = false,
  paymentProofPath = null,
  trackingCode = null,
  shippingCarrier = null,
  customerCpf = null,
  couponCode = null,
  mapUrl = null,
}: OrderStatusProps) {
  const t = useTranslations("order");
  const [status, setStatus] = useState(initialStatus);
  const [copied, setCopied] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [proofUploaded, setProofUploaded] = useState(hasPaymentProof);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() => {
    if (!pixExpiresAt) return null;
    return Math.max(0, Math.floor((new Date(pixExpiresAt).getTime() - Date.now()) / 1000));
  });

  // Countdown timer
  useEffect(() => {
    if (!pixExpiresAt || status !== "waiting_payment") return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(pixExpiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [pixExpiresAt, status]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/order/${orderId}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status) setStatus(data.status);
      }
    } catch {
      // Silently retry on next interval
    }
  }, [orderId]);

  useEffect(() => {
    if (status !== "waiting_payment" && status !== "payment_reported") return;
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [status, poll]);

  async function copyPixKey() {
    if (!pixBrCode) return;
    await navigator.clipboard.writeText(pixBrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function reportPayment() {
    setReporting(true);
    setReportError(null);
    try {
      const res = await fetch(`/api/order/${orderId}/report-payment`, { method: "POST" });
      if (res.ok) {
        setStatus("payment_reported");
      } else {
        const data = await res.json();
        setReportError(data.error ?? t("reportPaymentError"));
      }
    } catch {
      setReportError(t("reportPaymentError"));
    } finally {
      setReporting(false);
    }
  }

  const isWaiting = status === "waiting_payment";
  const isReported = status === "payment_reported";
  const isApproved = status === "approved" || status === "confirmed";
  const isShipped = status === "shipped";
  const isDelivered = status === "delivered";
  const isCancelled = status === "cancelled";
  const isExpired = secondsLeft !== null && secondsLeft <= 0 && isWaiting;
  const shortId = orderId.slice(0, 8).toUpperCase();
  const [trackingCopied, setTrackingCopied] = useState(false);

  // Format countdown MM:SS
  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // status label
  const STATUS_LABELS: Record<string, string> = {
    waiting_payment: t("waitingPayment"),
    payment_reported: t("paymentReported"),
    approved: t("approved"),
    shipped: t("timeline_shipped"),
    delivered: t("timeline_delivered"),
    cancelled: t("cancelled"),
  };

  // Build items for OrderTicket
  const ticketItems = items.map((item) => ({
    id: item.id,
    name: item.name,
    variantLabel: item.variantLabel,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    image: item.image,
  }));

  return (
    <div className="space-y-6">
      {!isApproved && (
        <FadeUp>
          <h1 className="text-center font-display text-3xl font-bold uppercase tracking-[0.1em]">
            {isShipped
              ? t("timeline_shipped")
              : isDelivered
                ? t("timeline_delivered")
                : isReported
                  ? t("paymentReported")
                  : isCancelled
                    ? t("cancelled")
                    : t("waitingPayment")}
          </h1>
          <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/40">
            No. {shortId}
          </p>
        </FadeUp>
      )}

      {/* Approved — Shopify-style confirmation page */}
      {isApproved && (
        <OrderConfirmation
          orderId={orderId}
          customerName={customerName}
          guestEmail={guestEmail}
          customerCpf={customerCpf}
          address={address}
          items={items}
          subtotalCents={subtotalCents}
          discountCents={discountCents}
          totalCents={totalCents}
          totalBrlCents={totalBrlCents}
          couponCode={couponCode}
          createdAt={createdAt}
          customerTzOffset={customerTzOffset}
          locale={locale}
          mapUrl={mapUrl}
        />
      )}

      {/* Status timeline (visible after payment is approved) */}
      {(isApproved || isShipped || isDelivered) && (
        <FadeUp delay={0.05}>
          <Card className="rounded-none border-t-[2px] border-t-foreground">
            <CardContent className="px-6 py-5">
              <OrderTimeline
                status={status}
                t={t}
                createdAt={createdAt}
                customerTzOffset={customerTzOffset}
                locale={locale}
              />
            </CardContent>
          </Card>
        </FadeUp>
      )}

      {/* Shipped / Delivered with tracking */}
      {(isShipped || isDelivered) && (
        <ScaleIn>
          <Card className="rounded-none border-t-[2px] border-t-foreground">
            <CardContent className="flex flex-col items-center gap-4 pt-6">
              <div className="flex h-16 w-16 items-center justify-center border-2 border-foreground">
                {isDelivered ? (
                  <HomeIcon className="h-8 w-8 text-foreground" />
                ) : (
                  <TruckIcon className="h-8 w-8 text-foreground" />
                )}
              </div>
              <p className="font-display text-sm font-bold uppercase tracking-[0.15em] text-foreground">
                {isDelivered ? t("timeline_delivered") : t("timeline_shipped")}
              </p>
              {trackingCode && (
                <div className="w-full space-y-2">
                  {shippingCarrier && (
                    <p className="text-center font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/50">
                      {t("shippingCarrier")}: {shippingCarrier}
                    </p>
                  )}
                  <p className="text-center font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/50">
                    {t("trackingCode")}
                  </p>
                  <div className="flex flex-col items-stretch gap-2 border border-foreground/20 bg-muted/40 p-3 sm:flex-row sm:items-center">
                    <code className="flex-1 truncate text-center font-mono text-sm font-bold tracking-wider sm:text-left">
                      {trackingCode}
                    </code>
                    <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5 rounded-none border-foreground/30 font-mono text-[10px] uppercase tracking-[0.1em]"
                        onClick={async () => {
                          await navigator.clipboard.writeText(trackingCode);
                          setTrackingCopied(true);
                          setTimeout(() => setTrackingCopied(false), 2000);
                        }}
                      >
                        {trackingCopied ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {trackingCopied ? t("trackingCopied") : t("copyTrackingCode")}
                      </Button>
                      {(() => {
                        const trackUrl = getTrackingUrl(shippingCarrier, trackingCode);
                        if (!trackUrl) return null;
                        return (
                          <Button
                            asChild
                            size="sm"
                            className="shrink-0 gap-1.5 rounded-none font-mono text-[10px] uppercase tracking-[0.1em]"
                          >
                            <a href={trackUrl} target="_blank" rel="noopener noreferrer">
                              {t("trackPackage")}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                  <p className="text-center font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/40">
                    {t("trackingDescription")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </ScaleIn>
      )}

      {/* Payment reported — awaiting admin confirmation */}
      {isReported && (
        <ScaleIn>
          <Card className="rounded-none border-t-[2px] border-t-foreground">
            <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center border-2 border-foreground/40">
                <Loader2 className="h-8 w-8 animate-spin text-foreground/50" />
              </div>
              <p className="font-display text-sm font-bold uppercase tracking-[0.15em]">
                {t("paymentReported")}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/50">
                {t("paymentReportedDescription")}
              </p>
            </CardContent>
            {/* Allow uploading/replacing proof while in reported state */}
            <div className="border-t border-foreground/10 px-6 pb-6 pt-4 space-y-4">
              <PaymentProofUpload
                orderId={orderId}
                hasExistingProof={proofUploaded}
                onSuccess={() => setProofUploaded(true)}
              />
              {proofUploaded && paymentProofPath && (
                <div className="flex items-center gap-3 rounded-md border border-foreground/10 bg-muted/40 p-3">
                  <PaymentProofViewer
                    orderId={orderId}
                    proofPath={paymentProofPath}
                    endpoint="client"
                    thumbnail
                    autoLoad
                    triggerLabel={t("viewProof")}
                  />
                  <div className="flex-1 text-left">
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/60">
                      {t("proofUploadSuccess")}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("viewProofHint")}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </ScaleIn>
      )}

      {/* Cancelled */}
      {isCancelled && (
        <FadeUp delay={0.1}>
          <Card className="rounded-none border-t-[2px] border-t-destructive/50">
            <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/50">
                {t("cancelledDescription")}
              </p>
              <Link href={`/${locale}/loja`}>
                <Button variant="outline" className="rounded-none border-foreground/30 font-mono text-[11px] uppercase tracking-[0.1em]">
                  {t("shopAgain")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </FadeUp>
      )}

      {/* Waiting for payment */}
      {isWaiting && (
        <FadeUp delay={0.1}>
          <Card className="rounded-none border-t-[2px] border-t-foreground">
            <CardHeader className="items-center border-b border-foreground/10">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2 text-foreground/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <CardTitle className="font-mono text-[11px] font-normal uppercase tracking-[0.15em]">
                    {isExpired ? t("paymentExpired") : t("waitingPayment")}
                  </CardTitle>
                </div>
                {/* Countdown */}
                {secondsLeft !== null && !isExpired && (
                  <div className="flex items-center gap-1.5 text-foreground/60">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono text-sm font-bold tabular-nums">
                      {formatCountdown(secondsLeft)}
                    </span>
                  </div>
                )}
                {isExpired && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-destructive/70">
                    {t("pixExpired")}
                  </span>
                )}
              </div>
            </CardHeader>

            {!isExpired && (
              <CardContent className="flex flex-col gap-6 pt-6">
              {/* Already paid? shortcut — accelerates conversion for returning users */}
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("proof-upload-section");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                className="group flex items-center gap-3 border-2 border-foreground/15 bg-secondary/30 p-4 text-left transition-colors hover:border-foreground/40 hover:bg-secondary/60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-foreground/30 bg-background">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-display text-[13px] font-bold uppercase tracking-[0.15em]">
                    {t("alreadyPaidTitle")}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/70">
                    {t("alreadyPaidHint")}
                  </span>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 border border-foreground/30 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors group-hover:bg-foreground group-hover:text-background">
                  <Upload className="h-3.5 w-3.5" />
                  {t("alreadyPaidCta")}
                </span>
              </button>

              {/* QR Code Image */}
              <div className="flex flex-col items-center gap-3">
                {pixBrCode ? (
                  <div className="border-2 border-foreground/20 bg-white p-3">
                    <PixQrCode brCode={pixBrCode} size={220} />
                  </div>
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center border border-foreground/20 bg-muted">
                    <QrCode className="h-16 w-16 text-foreground/20" />
                  </div>
                )}
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/40">
                  {t("pixScanOrCopy")}
                </p>
              </div>

              {/* Copia e Cola */}
              {pixBrCode && (
                <div className="flex flex-col gap-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/50">
                    {t("pixCopiaCola")}
                  </p>
                  <div className="flex items-center gap-2 border border-foreground/20 bg-muted/40 p-3">
                    <code className="flex-1 truncate font-mono text-[11px]">
                      {pixBrCode}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5 rounded-none border-foreground/30 font-mono text-[10px] uppercase tracking-[0.1em]"
                      onClick={copyPixKey}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied ? t("pixCopied") : t("copyPixKey")}
                    </Button>
                  </div>
                </div>
              )}
                {/* BRL amount */}
                {totalBrlCents && (
                  <div className="flex items-center justify-between border border-foreground/10 bg-secondary/40 px-4 py-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60">
                      {t("pixAmountLabel")}
                    </span>
                    <span className="font-mono text-lg font-bold">
                      {(totalBrlCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                )}

                {/* Instruction */}
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/50">
                  {t("pixInstruction", { id: shortId })}
                </p>

                {/* Upload payment proof */}
                <div id="proof-upload-section" className="scroll-mt-24 border-t border-foreground/10 pt-4">
                  <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/50">
                    {t("proofUploadTitle")}
                  </p>
                  <PaymentProofUpload
                    orderId={orderId}
                    hasExistingProof={proofUploaded}
                    onSuccess={(newStatus) => {
                      setProofUploaded(true);
                      setStatus(newStatus);
                    }}
                  />
                </div>

                {/* I Paid button (without proof) */}
                <div className="flex flex-col items-center gap-2 border-t border-foreground/10 pt-4">
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.1em] text-foreground/60">
                    {t("reportPaymentNoProofHint")}
                  </p>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full gap-2 rounded-none border-foreground/30 font-mono text-[11px] font-bold uppercase tracking-[0.15em]"
                    onClick={reportPayment}
                    disabled={reporting}
                  >
                    {reporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {t("reportPaymentBtn")}
                  </Button>
                  {reportError && (
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-destructive">
                      {reportError}
                    </p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </FadeUp>
      )}

      {/* ── Order Ticket (Industrial Bento Layout) — hidden when approved ── */}
      {!isApproved && ticketItems.length > 0 && (
        <FadeUp delay={0.15}>
          <OrderTicket
            orderId={orderId}
            status={status}
            statusLabel={STATUS_LABELS[status] ?? status}
            createdAt={createdAt}
            customerTzOffset={customerTzOffset}
            customerName={customerName}
            email={guestEmail}
            customerCpf={customerCpf}
            address={address}
            items={ticketItems}
            subtotalCents={subtotalCents}
            discountCents={discountCents}
            totalCents={totalCents}
            totalBrlCents={totalBrlCents}
            trackingCode={trackingCode}
            shippingCarrier={shippingCarrier}
            locale={locale}
          />
        </FadeUp>
      )}

      {isApproved && guestEmail && (
        <FadeUp delay={0.25}>
          <Card className="rounded-none border border-foreground/15">
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <UserPlus className="h-8 w-8 text-foreground/50" />
              <p className="font-display text-sm font-bold uppercase tracking-[0.1em]">{t("createAccountCta")}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-foreground/40">
                {t("createAccountDescription")}
              </p>
              <Link
                href={`/${locale}/sign-up?email=${encodeURIComponent(guestEmail)}`}
              >
                <Button variant="outline" className="mt-1 rounded-none border-foreground/30 font-mono text-[11px] uppercase tracking-[0.1em]">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t("createAccount")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </FadeUp>
      )}
    </div>
  );
}
