"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Check,
  CircleDot,
  CreditCard,
  Mail,
  MapPin,
  Package,
  Tag,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeUp, ScaleIn } from "@/components/motion";
import { CropMarks } from "@/components/product/crop-marks";
import { RuledDivider } from "@/components/product/ruled-divider";
import { formatPrice } from "@/lib/format-price";
import { formatOrderDateForCustomer } from "@/lib/format-date";

/* ─── Types ─────────────────────────────────────────── */

interface OrderItem {
  id: string;
  name: string;
  variantLabel: string;
  quantity: number;
  unitPriceCents: number;
  image: string | null;
}

interface OrderConfirmationProps {
  orderId: string;
  customerName: string | null;
  guestEmail: string | null;
  customerCpf?: string | null;
  address: Record<string, string> | null;
  items: OrderItem[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  totalBrlCents: number | null;
  couponCode?: string | null;
  createdAt: string;
  customerTzOffset?: number | null;
  locale: string;
  mapUrl?: string | null;
}

/* ─── Helpers ───────────────────────────────────────── */

function thumbUrl(url: string | null) {
  if (!url) return null;
  return url.replace(/\.(mp4|webm|mov)($|\?)/i, ".jpg$2");
}

/* ─── Component ─────────────────────────────────────── */

export function OrderConfirmation({
  orderId,
  customerName,
  guestEmail,
  customerCpf,
  address,
  items,
  subtotalCents,
  discountCents,
  totalCents,
  totalBrlCents,
  couponCode,
  createdAt,
  customerTzOffset = null,
  locale,
  mapUrl = null,
}: OrderConfirmationProps) {
  const t = useTranslations("order");
  const shortId = orderId.slice(0, 8).toUpperCase();
  const shippingCents = totalCents - subtotalCents + discountCents;
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const dateStr = formatOrderDateForCustomer(createdAt, customerTzOffset, locale, {
    withTime: false,
  });

  const cityState = address
    ? [address.city, address.state].filter(Boolean).join(", ")
    : null;

  return (
    <div className="space-y-8">
      {/* ── CONFIRMATION HERO ── */}
      <FadeUp>
        <div className="flex flex-col items-center gap-4 text-center">
          <ScaleIn>
            <div className="flex h-16 w-16 items-center justify-center border-2 border-primary bg-primary/5">
              <Check className="h-8 w-8 text-primary" strokeWidth={3} />
            </div>
          </ScaleIn>

          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-foreground/50">
              {t("confirmation_number")} #{shortId}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">
              {t("confirmation_thanks", { name: customerName || "" })}
            </h1>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-foreground/50">
            {t("confirmation_email_notice")}
          </p>
        </div>
      </FadeUp>

      {/* ── TWO-COLUMN LAYOUT ── */}
      <FadeUp delay={0.1}>
        <div className="relative p-3 md:p-4">
          <CropMarks />

          <div className="grid gap-0 border-t-[3px] border-b-[3px] border-foreground border-x border-x-foreground/40 bg-card lg:grid-cols-5">
            {/* ── LEFT COLUMN ── */}
            <div className="lg:col-span-3 lg:border-r lg:border-foreground/15">
              {/* Static Map */}
              {mapUrl && address && (
                <div className="relative">
                  <Image
                    src={mapUrl}
                    alt={t("confirmation_delivery_address")}
                    width={600}
                    height={260}
                    className="h-auto w-full object-cover"
                    unoptimized
                  />
                  {/* Floating address label */}
                  <div className="absolute left-4 top-4 max-w-[70%] border border-foreground/15 bg-card/95 px-3 py-2 shadow-sm backdrop-blur-sm">
                    <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-foreground/50">
                      {t("confirmation_delivery_address")}
                    </p>
                    <p className="font-mono text-xs font-bold text-foreground">
                      {cityState}
                    </p>
                  </div>
                </div>
              )}

              {/* No-map fallback: styled address card */}
              {!mapUrl && address && (
                <div className="flex items-start gap-3 border-b border-foreground/10 px-5 py-5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-foreground/40" />
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-foreground/50">
                      {t("confirmation_delivery_address")}
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-foreground">
                      {cityState}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-foreground/70">
                      {[address.street, address.number].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Status confirmation line */}
              <div className="flex items-center gap-3 border-b border-foreground/10 px-5 py-4">
                <CircleDot className="size-4 text-primary" />
                <div>
                  <p className="font-mono text-sm font-bold uppercase tracking-tight text-foreground">
                    {t("confirmed")}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-foreground/50">
                    {t("confirmation_email_soon")}
                  </p>
                </div>
              </div>

              {/* Estimated delivery */}
              <div className="flex items-center gap-3 border-b border-foreground/10 px-5 py-4">
                <Truck className="size-4 text-foreground/40" />
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/50">
                    {t("confirmation_estimated_delivery")}
                  </p>
                  <p className="font-mono text-sm font-bold text-foreground">
                    {t("confirmation_delivery_time")}
                  </p>
                </div>
              </div>

              {/* ── INFO GRID (2×2) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {/* Contact */}
                <div className="border-b border-r-0 border-foreground/10 px-5 py-4 sm:border-r">
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-foreground/50">
                    <Mail className="size-3" />
                    {t("confirmation_contact")}
                  </span>
                  <p className="mt-2 font-mono text-sm text-foreground">
                    {guestEmail || "—"}
                  </p>
                  {customerCpf && (
                    <p className="mt-1 font-mono text-xs text-foreground/60">
                      CPF: {customerCpf}
                    </p>
                  )}
                </div>

                {/* Payment */}
                <div className="border-b border-foreground/10 px-5 py-4">
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-foreground/50">
                    <CreditCard className="size-3" />
                    {t("confirmation_payment_method")}
                  </span>
                  <p className="mt-2 font-mono text-sm text-foreground">
                    PIX
                    {totalBrlCents && (
                      <span className="ml-1 text-foreground/60">
                        · {(totalBrlCents / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    )}
                  </p>
                </div>

                {/* Shipping address */}
                {address && (
                  <div className="border-b border-r-0 border-foreground/10 px-5 py-4 sm:border-r">
                    <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-foreground/50">
                      <MapPin className="size-3" />
                      {t("confirmation_shipping_address")}
                    </span>
                    <div className="mt-2 space-y-0.5">
                      {customerName && (
                        <p className="font-mono text-sm font-bold text-foreground">
                          {customerName}
                        </p>
                      )}
                      <p className="font-mono text-[11px] text-foreground/80">
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
                        {cityState}
                      </p>
                      {address.zip && (
                        <p className="font-mono text-xs font-bold tracking-wider text-foreground/60">
                          CEP {address.zip}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Billing address (same as shipping for PIX) */}
                {address && (
                  <div className="border-b border-foreground/10 px-5 py-4">
                    <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-foreground/50">
                      <MapPin className="size-3" />
                      {t("confirmation_billing_address")}
                    </span>
                    <div className="mt-2 space-y-0.5">
                      {customerName && (
                        <p className="font-mono text-sm font-bold text-foreground">
                          {customerName}
                        </p>
                      )}
                      <p className="font-mono text-[11px] text-foreground/80">
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
                        {cityState}
                      </p>
                      {address.zip && (
                        <p className="font-mono text-xs font-bold tracking-wider text-foreground/60">
                          CEP {address.zip}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Shipping method */}
                <div className="border-b border-foreground/10 px-5 py-4 sm:col-span-2">
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-foreground/50">
                    <Package className="size-3" />
                    {t("confirmation_shipping_method")}
                  </span>
                  <p className="mt-2 font-mono text-sm text-foreground">
                    {shippingCents > 0
                      ? `${t("confirmation_standard_shipping")} · ${formatPrice(shippingCents, locale)}`
                      : t("confirmation_free_shipping")}
                  </p>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: Items + Pricing ── */}
            <div className="lg:col-span-2">
              {/* Items list */}
              <div className="border-b border-foreground/10">
                {items.map((item, idx) => {
                  const img = thumbUrl(item.image);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        idx < items.length - 1 ? "border-b border-foreground/10" : ""
                      }`}
                    >
                      {/* Thumbnail with quantity badge */}
                      <div className="relative size-14 shrink-0 overflow-hidden border border-foreground/10 bg-muted">
                        {img ? (
                          <Image
                            src={img}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Package className="size-5 text-foreground/20" />
                          </div>
                        )}
                        {/* Qty badge */}
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                          {item.quantity}
                        </span>
                      </div>

                      {/* Name + variant */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm font-bold uppercase tracking-tight text-foreground">
                          {item.name}
                        </p>
                        {item.variantLabel && (
                          <p className="font-mono text-[10px] text-foreground/50">
                            {item.variantLabel}
                          </p>
                        )}
                      </div>

                      {/* Price */}
                      <p className="shrink-0 font-mono text-sm font-bold text-foreground">
                        {formatPrice(item.unitPriceCents * item.quantity, locale)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-2 px-5 py-4">
                <div className="flex justify-between font-mono text-[11px] text-foreground/70">
                  <span>
                    {t("confirmation_subtotal")} · {totalItems}{" "}
                    {totalItems === 1
                      ? t("confirmation_item")
                      : t("confirmation_items")}
                  </span>
                  <span>{formatPrice(subtotalCents, locale)}</span>
                </div>

                {discountCents > 0 && (
                  <div className="flex justify-between font-mono text-[11px] text-primary">
                    <span className="flex items-center gap-1">
                      <Tag className="size-3" />
                      {t("confirmation_discount")}
                      {couponCode && (
                        <span className="text-foreground/50">({couponCode})</span>
                      )}
                    </span>
                    <span>-{formatPrice(discountCents, locale)}</span>
                  </div>
                )}

                <div className="flex justify-between font-mono text-[11px] text-foreground/70">
                  <span>{t("confirmation_shipping")}</span>
                  <span>
                    {shippingCents > 0
                      ? formatPrice(shippingCents, locale)
                      : t("confirmation_free")}
                  </span>
                </div>

                <RuledDivider variant="thin" className="my-2" />

                <div className="flex items-baseline justify-between">
                  <span className="font-display text-sm font-bold uppercase tracking-[0.15em]">
                    Total
                  </span>
                  <span className="font-mono text-lg font-bold">
                    {formatPrice(totalCents, locale)}
                  </span>
                </div>

                {totalBrlCents != null && (
                  <div className="flex justify-between font-mono text-[10px] text-foreground/50">
                    <span>PIX (BRL)</span>
                    <span>
                      {(totalBrlCents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                )}

                {discountCents > 0 && (
                  <div className="mt-1 flex items-center justify-end gap-1.5">
                    <Tag className="size-3 text-primary" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
                      {t("confirmation_savings")} {formatPrice(discountCents, locale)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* ── FOOTER CTAs ── */}
      <FadeUp delay={0.2}>
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-foreground/60">
            {t("confirmation_need_help")}{" "}
            <a
              href="mailto:pedidos@sementesdecolecao.com"
              className="font-medium text-primary underline underline-offset-2 hover:no-underline"
            >
              {t("confirmation_contact_us")}
            </a>
          </p>
          <Link href={`/${locale}/loja`}>
            <Button className="rounded-full px-8 font-mono text-xs uppercase tracking-[0.1em]">
              {t("confirmation_back_to_shop")}
            </Button>
          </Link>
          <p className="font-mono text-[8px] uppercase tracking-[0.25em] text-foreground/30">
            {dateStr} · #{shortId}
          </p>
        </div>
      </FadeUp>
    </div>
  );
}
