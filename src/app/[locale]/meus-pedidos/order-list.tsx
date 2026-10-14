"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ExternalLink,
  Package,
  ShoppingBag,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentProofUpload } from "@/components/payment-proof-upload";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format-price";
import { formatOrderDateForCustomer } from "@/lib/format-date";
import { getTrackingUrl } from "@/lib/tracking-url";
import { useLocale, useTranslations } from "next-intl";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price_cents: number;
  products: {
    slug: string;
    images: string[];
    product_translations: { name: string; locale: string }[];
  } | null;
  product_variants: {
    seed_count: number;
  } | null;
}

interface Order {
  id: string;
  status: string;
  total_cents: number;
  created_at: string;
  customer_tz_offset?: number | null;
  tracking_code?: string | null;
  shipping_carrier?: string | null;
  order_items?: OrderItem[];
}

const STATUS_BADGE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  waiting_payment: "outline",
  payment_reported: "outline",
  approved: "secondary",
  confirmed: "secondary",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
};

const FILTER_KEYS = [
  "all",
  "waiting_payment",
  "approved",
  "shipped",
  "delivered",
  "cancelled",
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];

function getLocaleDateStr(
  date: string,
  locale: string,
  tzOffset: number | null | undefined,
) {
  return formatOrderDateForCustomer(date, tzOffset, locale, {
    withTime: false,
    withOffsetSuffix: false,
  });
}

function thumbUrl(url: string | undefined) {
  if (!url) return undefined;
  return url.replace(/\.(mp4|webm|mov)($|\?)/i, ".jpg$2");
}

export function OrderList({ orders }: { orders: Order[] }) {
  const locale = useLocale();
  const t = useTranslations("account");
  const ot = useTranslations("order");
  const [uploadOrderId, setUploadOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      waiting_payment: ot("waitingPayment"),
      payment_reported: ot("paymentReported"),
      approved: ot("approved"),
      confirmed: ot("confirmed"),
      shipped: t("shipped"),
      delivered: t("delivered"),
      cancelled: t("cancelled"),
    };
    return map[status] ?? status;
  };

  // Empty state
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) {
      const key = (
        o.status === "payment_reported"
          ? "waiting_payment"
          : o.status === "confirmed"
            ? "approved"
            : o.status
      ) as string;
      c[key] = (c[key] ?? 0) + 1;
    }
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => {
      const normalized =
        o.status === "payment_reported"
          ? "waiting_payment"
          : o.status === "confirmed"
            ? "approved"
            : o.status;
      return normalized === filter;
    });
  }, [orders, filter]);

  if (orders.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="bg-foreground/5 flex h-16 w-16 items-center justify-center rounded-full">
          <ShoppingBag className="h-7 w-7 text-foreground/40" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{ot("empty.title")}</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            {ot("empty.description")}
          </p>
        </div>
        <Button asChild>
          <Link href={`/${locale}`}>{ot("empty.cta")}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as FilterKey)}
        className="w-full"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          {FILTER_KEYS.map((key) => {
            const count = counts[key] ?? 0;
            return (
              <TabsTrigger
                key={key}
                value={key}
                disabled={key !== "all" && count === 0}
                className="data-[state=active]:bg-foreground data-[state=active]:text-background gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                {ot(`filter.${key}`)}
                {count > 0 && (
                  <span className="text-muted-foreground data-[active=true]:text-background/70 text-xs">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {filtered.map((order) => {
          const items = order.order_items ?? [];
          const previews = items.slice(0, 3);
          const extra = Math.max(0, items.length - previews.length);
          const trackUrl = getTrackingUrl(
            order.shipping_carrier,
            order.tracking_code,
          );

          return (
            <Card
              key={order.id}
              className="overflow-hidden border-border p-0"
            >
              {/* Top strip */}
              <div className="bg-muted/40 flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium">
                    {ot("orderNumber", {
                      id: order.id.slice(0, 8).toUpperCase(),
                    })}
                  </span>
                  <span className="text-muted-foreground">
                    {ot("placedOn", {
                      date: getLocaleDateStr(
                        order.created_at,
                        locale,
                        order.customer_tz_offset,
                      ),
                    })}
                  </span>
                </div>
                <Badge
                  variant={STATUS_BADGE[order.status] ?? "outline"}
                  className="self-start sm:self-auto"
                >
                  {statusLabel(order.status)}
                </Badge>
              </div>

              {/* Body */}
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:gap-6">
                {/* Item previews */}
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="flex -space-x-3">
                    {previews.length > 0 ? (
                      previews.map((item) => {
                        const productName =
                          item.products?.product_translations?.find(
                            (tr) => tr.locale === locale,
                          )?.name ??
                          item.products?.product_translations?.[0]?.name ??
                          "—";
                        const image = thumbUrl(item.products?.images?.[0]);
                        return (
                          <div
                            key={item.id}
                            className="ring-background relative h-14 w-14 overflow-hidden rounded-md ring-2 bg-muted"
                          >
                            {image ? (
                              <Image
                                src={image}
                                alt={productName}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    {extra > 0 && (
                      <div className="ring-background bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded-md text-sm font-medium ring-2">
                        +{extra}
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <p className="truncate text-sm font-medium">
                      {items
                        .map(
                          (i) =>
                            i.products?.product_translations?.find(
                              (tr) => tr.locale === locale,
                            )?.name ??
                            i.products?.product_translations?.[0]?.name ??
                            "",
                        )
                        .filter(Boolean)
                        .slice(0, 2)
                        .join(" · ")}
                      {items.length > 2 && " · …"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("orderCount", { count: items.length })}
                    </p>
                  </div>
                </div>

                {/* Total */}
                <div className="flex shrink-0 items-center gap-2 lg:gap-6">
                  <Separator
                    orientation="vertical"
                    className="hidden h-12 lg:block"
                  />
                  <div className="text-left lg:text-right">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("price")}
                    </p>
                    <p className="text-base font-semibold">
                      {formatPrice(order.total_cents, locale)}
                    </p>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end">
                  {trackUrl && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                    >
                      <a
                        href={trackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {ot("trackPackage")}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  {(order.status === "waiting_payment" ||
                    order.status === "payment_reported") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setUploadOrderId(order.id)}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {ot("sendProofBtn")}
                    </Button>
                  )}
                  <Button asChild size="sm" className="gap-1.5">
                    <Link href={`/${locale}/pedido/${order.id}`}>
                      {t("viewDetails")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Package className="h-6 w-6 text-foreground/30" />
            <p>{ot("empty.title")}</p>
          </Card>
        )}
      </div>

      {/* Upload proof dialog */}
      <Dialog
        open={!!uploadOrderId}
        onOpenChange={(open) => !open && setUploadOrderId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{ot("proofUploadTitle")}</DialogTitle>
          </DialogHeader>
          {uploadOrderId && (
            <PaymentProofUpload
              orderId={uploadOrderId}
              onSuccess={() => {
                setTimeout(() => setUploadOrderId(null), 1500);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
