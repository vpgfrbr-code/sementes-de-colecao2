"use client";

import { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Hash,
  MapPin,
  Receipt,
  Tag,
  Truck,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CropMarks } from "@/components/product/crop-marks";
import { RuledDivider } from "@/components/product/ruled-divider";
import { SafeImage } from "@/components/safe-image";
import { formatPrice } from "@/lib/format-price";
import { formatOrderDateForCustomer, formatOrderDateForAdmin } from "@/lib/format-date";

/* ─── Types ─────────────────────────────────────────────── */

export interface OrderTicketItem {
  id: string;
  name: string;
  variantLabel: string;
  quantity: number;
  unitPriceCents: number;
  image: string | null;
  href?: string;
}

export interface OrderTicketProps {
  orderId: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  customerName: string | null;
  email: string | null;
  customerCpf?: string | null;
  address: Record<string, string> | null;
  items: OrderTicketItem[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  totalBrlCents: number | null;
  exchangeRate?: number | null;
  couponCode?: string | null;
  trackingCode?: string | null;
  shippingCarrier?: string | null;
  locale: string;
  /**
   * Browser-reported timezone offset (minutes east of UTC) at checkout.
   * Customer view formats in this offset; falls back to São Paulo when null.
   */
  customerTzOffset?: number | null;
  /**
   * When true, format timestamps in America/Sao_Paulo regardless of the
   * customer's offset. Used by the admin order page so the team always sees
   * a consistent wall-clock.
   */
  adminView?: boolean;
  /** Extra content injected after the items grid (e.g. PIX QR, proof upload) */
  children?: ReactNode;
}

/* ─── Status colours ────────────────────────────────────── */

const STATUS_COLOR: Record<string, string> = {
  waiting_payment: "text-foreground/80 border-foreground/40",
  payment_reported: "text-amber-700 border-amber-600/40",
  approved: "text-emerald-700 border-emerald-600/40",
  shipped: "text-sky-700 border-sky-600/40",
  delivered: "text-emerald-800 border-emerald-700/40",
  cancelled: "text-destructive border-destructive/40",
};

/* ─── Helpers ───────────────────────────────────────────── */

function thumbUrl(url: string | null) {
  if (!url) return null;
  // convert video URLs to jpg poster sibling
  return url.replace(/\.(mp4|webm|mov)($|\?)/i, ".jpg$2");
}

/* ─── Component ─────────────────────────────────────────── */

export function OrderTicket({
  orderId,
  status,
  statusLabel,
  createdAt,
  customerName,
  email,
  customerCpf,
  address,
  items,
  subtotalCents,
  discountCents,
  totalCents,
  totalBrlCents,
  exchangeRate,
  couponCode,
  trackingCode,
  shippingCarrier,
  locale,
  customerTzOffset,
  adminView = false,
  children,
}: OrderTicketProps) {
  const shortId = orderId.slice(0, 8).toUpperCase();
  const dateStr = adminView
    ? formatOrderDateForAdmin(createdAt, locale, { withTime: false })
    : formatOrderDateForCustomer(createdAt, customerTzOffset, locale, {
        withTime: false,
        withOffsetSuffix: false,
      });
  // Long date in the header (no time), with a GMT suffix on the customer
  // view so international buyers can disambiguate vs their current timezone.
  const fullDate = adminView
    ? new Intl.DateTimeFormat(
        locale === "pt" ? "pt-BR" : locale === "es" ? "es" : "en-US",
        {
          timeZone: "America/Sao_Paulo",
          day: "2-digit",
          month: "long",
          year: "numeric",
        },
      ).format(new Date(createdAt))
    : formatOrderDateForCustomer(createdAt, customerTzOffset, locale, {
        withTime: false,
      });

  const shippingCents = totalCents - subtotalCents + discountCents;

  return (
    <div className="relative p-4 md:p-5">
      <CropMarks />

      {/* Outer frame */}
      <div className="relative overflow-hidden border-t-[3px] border-b-[3px] border-foreground border-x border-x-foreground/40 bg-card">
        {/* Dot grid texture */}
        <div className="dot-grid-bg absolute inset-0 text-foreground" />

        {/* ── HEADER: Brand + Order Number ── */}
        <div className="relative border-b border-foreground/20 px-5 py-4 md:px-6 md:py-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/60">
                SEMENTES DE COLEÇÃO
              </span>
              <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-tight md:text-4xl lg:text-5xl">
                PEDIDO
              </h1>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-foreground/60">
                {fullDate}
              </span>
              <p className="mt-1 font-display text-2xl font-bold uppercase tracking-tight md:text-3xl">
                #{shortId}
              </p>
            </div>
          </div>
          <RuledDivider variant="ornamental" className="mt-3" />
        </div>

        {/* ── META ROW: Status / Date / Customer / Tracking ── */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 items-stretch border-b border-foreground/20">
          {/* Status */}
          <div className="flex flex-col gap-1.5 px-4 py-3.5 text-center border-b md:border-b-0 md:border-r border-foreground/10">
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/60">
              STATUS
            </span>
            <span
              className={cn(
                "inline-block self-center text-[10px] font-mono font-bold uppercase tracking-[0.15em] border px-2 py-0.5 -rotate-1",
                STATUS_COLOR[status] ?? "text-foreground/60 border-foreground/30"
              )}
            >
              {statusLabel}
            </span>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5 px-4 py-3.5 text-center border-b md:border-b-0 md:border-r border-foreground/10">
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/60">
              <CalendarDays className="inline-block size-3 mr-1 -mt-0.5" />
              DATA
            </span>
            <span className="text-sm font-mono font-bold uppercase">{dateStr}</span>
          </div>

          {/* Customer */}
          <div className="flex flex-col gap-1.5 px-4 py-3.5 text-center border-b md:border-b-0 md:border-r border-foreground/10">
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/60">
              <User className="inline-block size-3 mr-1 -mt-0.5" />
              CLIENTE
            </span>
            <span className="text-sm font-mono font-bold uppercase truncate">
              {customerName || email || "—"}
            </span>
            {customerCpf && (
              <span className="text-[9px] font-mono text-foreground/50">
                CPF: {customerCpf}
              </span>
            )}
          </div>

          {/* Tracking or Order Hash */}
          <div className="flex flex-col gap-1.5 px-4 py-3.5 text-center">
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/60">
              {trackingCode ? (
                <>
                  <Truck className="inline-block size-3 mr-1 -mt-0.5" />
                  RASTREIO
                </>
              ) : (
                <>
                  <Hash className="inline-block size-3 mr-1 -mt-0.5" />
                  CÓDIGO
                </>
              )}
            </span>
            <span className="text-sm font-mono font-bold uppercase tracking-tight truncate">
              {trackingCode
                ? `${shippingCarrier ? shippingCarrier.toUpperCase() + " " : ""}${trackingCode}`
                : orderId.slice(0, 12).toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── ITEMS LIST with inline thumbnails ── */}
        {items.length > 0 && (
          <div className="relative border-b border-foreground/20">
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-foreground/10">
              <span className="font-display text-sm font-bold uppercase tracking-[0.2em]">
                CONTEÚDO
              </span>
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-foreground/60">
                {items.length} ITEM{items.length !== 1 ? "S" : ""}
              </span>
            </div>

            <div>
              {items.map((item, idx) => {
                const img = thumbUrl(item.image);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "relative flex items-center gap-3 md:gap-4 px-5 py-3",
                      idx < items.length - 1 && "border-b border-foreground/10"
                    )}
                  >
                    <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-foreground/50 w-5 shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    {/* Inline thumbnail */}
                    {img && (
                      <div className="relative size-12 md:size-14 shrink-0 overflow-hidden border border-foreground/10 bg-muted">
                        <SafeImage
                          src={img}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {item.href ? (
                        <Link href={item.href} className="hover:underline">
                          <span className="font-mono text-sm font-bold uppercase tracking-tight">
                            {item.name}
                          </span>
                        </Link>
                      ) : (
                        <span className="font-mono text-sm font-bold uppercase tracking-tight">
                          {item.name}
                        </span>
                      )}
                      {item.variantLabel && (
                        <span className="ml-2 text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/60">
                          {item.variantLabel}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 text-center w-12">
                      <span className="block text-[8px] font-mono uppercase tracking-[0.2em] text-foreground/60">QTD</span>
                      <span className="block text-sm font-mono font-bold">{item.quantity}</span>
                    </div>

                    <div className="shrink-0 text-right w-20 hidden md:block">
                      <span className="block text-[8px] font-mono uppercase tracking-[0.2em] text-foreground/60">UNIT.</span>
                      <span className="block text-sm font-mono font-bold">{formatPrice(item.unitPriceCents, locale)}</span>
                    </div>

                    <div className="shrink-0 text-right w-24">
                      <span className="block text-[8px] font-mono uppercase tracking-[0.2em] text-foreground/60">TOTAL</span>
                      <span className="block text-sm font-mono font-bold">{formatPrice(item.unitPriceCents * item.quantity, locale)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── INJECTED CONTENT (PIX QR, proof upload, etc.) ── */}
        {children && (
          <div className="relative border-b border-foreground/20">
            {children}
          </div>
        )}

        {/* ── ADDRESS + PRICING ── */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 border-b border-foreground/20">
          {/* Address — structured & readable */}
          {address && (
            <div className="border-b md:border-b-0 md:border-r border-foreground/10 px-5 py-4">
              <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/60 mb-3">
                <MapPin className="size-3" />
                ENDEREÇO DE ENTREGA
              </span>
              <div className="space-y-1">
                <p className="font-mono text-sm font-bold text-foreground">
                  {[address.street, address.number].filter(Boolean).join(", ")}
                </p>
                {address.complement && (
                  <p className="font-mono text-[11px] text-foreground/70">
                    {address.complement}
                  </p>
                )}
                {address.neighborhood && (
                  <p className="font-mono text-[11px] text-foreground/80">
                    {address.neighborhood}
                  </p>
                )}
                <p className="font-mono text-[11px] text-foreground/80">
                  {[address.city, address.state].filter(Boolean).join(" \u2014 ")}
                </p>
                {address.zip && (
                  <p className="font-mono text-xs font-bold tracking-wider text-foreground/70 mt-1">
                    CEP {address.zip}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Pricing breakdown */}
          <div className={cn("px-5 py-4", !address && "md:col-span-2")}>
            <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/60 mb-3">
              <Receipt className="size-3" />
              RESUMO FINANCEIRO
            </span>

            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-[11px] text-foreground/80">
                <span>SUBTOTAL</span>
                <span>{formatPrice(subtotalCents, locale)}</span>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between font-mono text-[11px] text-primary">
                  <span className="flex items-center gap-1">
                    <Tag className="size-3" />
                    DESCONTO{couponCode ? ` (${couponCode})` : ""}
                  </span>
                  <span>-{formatPrice(discountCents, locale)}</span>
                </div>
              )}
              {shippingCents > 0 && (
                <div className="flex justify-between font-mono text-[11px] text-foreground/80">
                  <span>FRETE</span>
                  <span>{formatPrice(shippingCents, locale)}</span>
                </div>
              )}

              <RuledDivider variant="thin" className="my-2" />

              {totalBrlCents != null ? (
                <>
                  <div className="flex justify-between items-baseline">
                    <span className="font-display text-sm font-bold uppercase tracking-[0.15em]">
                      TOTAL <span className="text-[10px] text-foreground/60">(PIX)</span>
                    </span>
                    <span className="font-mono text-2xl font-bold tracking-tight">
                      {(totalBrlCents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-foreground/60">
                    <span>
                      {formatPrice(totalCents, locale)}
                      {exchangeRate ? ` · 1 USD = ${Number(exchangeRate).toFixed(2)} BRL` : ""}
                    </span>
                    <span className="uppercase tracking-[0.15em]">USD</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-baseline">
                  <span className="font-display text-sm font-bold uppercase tracking-[0.15em]">
                    TOTAL
                  </span>
                  <span className="font-mono text-lg font-bold">
                    {formatPrice(totalCents, locale)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── FOOTER BAR ── */}
        <div className="relative flex items-center justify-between px-5 py-2.5">
          <span className="text-[8px] font-mono font-semibold uppercase tracking-[0.25em] text-foreground/50">
            SEMENTES DE COLEÇÃO — REGISTRO DE PEDIDO
          </span>
          <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-foreground/40">
            No. {orderId.slice(0, 12).toUpperCase()}
          </span>
        </div>

        {/* Barcode-style decoration */}
        <div className="relative flex items-center gap-2 border-t border-foreground/10 px-5 py-2">
          <div className="flex gap-[2px]">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="bg-foreground/35"
                style={{
                  width: i % 3 === 0 ? "2px" : "1px",
                  height: i % 5 === 0 ? "14px" : "10px",
                }}
              />
            ))}
          </div>
          <span className="ml-auto text-[7px] font-mono uppercase tracking-[0.2em] text-foreground/40">
            {orderId.replace(/-/g, " ").slice(0, 24)}
          </span>
        </div>
      </div>
    </div>
  );
}
