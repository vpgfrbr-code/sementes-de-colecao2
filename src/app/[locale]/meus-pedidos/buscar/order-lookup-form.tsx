"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Mail,
  Package,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeUp } from "@/components/motion";
import { formatPrice } from "@/lib/format-price";
import { formatOrderDateForCustomer } from "@/lib/format-date";
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
  order_items?: OrderItem[];
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  waiting_payment: "outline",
  approved: "default",
  shipped: "secondary",
  delivered: "secondary",
  cancelled: "destructive",
};

type Step = "email" | "code" | "orders";

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

export function OrderLookupForm() {
  const locale = useLocale();
  const t = useTranslations("orderLookup");
  const ot = useTranslations("order");
  const at = useTranslations("account");
  const pt = useTranslations("product");
  const ct = useTranslations("common");

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      waiting_payment: ot("waitingPayment"),
      approved: ot("approved"),
      shipped: at("shipped"),
      delivered: at("delivered"),
      cancelled: at("cancelled"),
    };
    return map[status] ?? status;
  };

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/order-lookup/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (res.status === 429) {
        setError(t("tooManyRequests"));
        return;
      }

      if (!res.ok) {
        setError(t("error"));
        return;
      }

      setStep("code");
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/order-lookup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
      });

      if (!res.ok) {
        setError(t("invalidCode"));
        return;
      }

      const data = await res.json();
      setToken(data.token);

      // Fetch orders
      const ordersRes = await fetch("/api/order-lookup/orders", {
        headers: { Authorization: `Bearer ${data.token}` },
      });

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders);
      }

      setStep("orders");
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-foreground">
            <Search className="h-6 w-6 text-foreground/60" />
          </div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-[0.1em]">
            {t("title")}
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/40">{t("subtitle")}</p>
        </div>
      </FadeUp>

      {step === "email" && (
        <FadeUp delay={0.1}>
          <Card className="rounded-none border-t-[2px] border-t-foreground">
            <CardHeader className="border-b border-foreground/10">
              <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.2em]">
                <Mail className="h-5 w-5" />
                {t("enterEmail")}
              </CardTitle>
              <CardDescription className="font-mono text-[10px] uppercase tracking-[0.1em]">{t("enterEmailDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lookup-email">{t("email")}</Label>
                  <Input
                    id="lookup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full rounded-none font-mono text-[11px] uppercase tracking-[0.1em]"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  {t("sendCode")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </FadeUp>
      )}

      {step === "code" && (
        <FadeUp delay={0.1}>
          <Card className="rounded-none border-t-[2px] border-t-foreground">
            <CardHeader className="border-b border-foreground/10">
              <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.2em]">
                <ShieldCheck className="h-5 w-5" />
                {t("enterCode")}
              </CardTitle>
              <CardDescription className="font-mono text-[10px] uppercase tracking-[0.1em]">
                {t("codeSentTo", { email })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lookup-code">{t("verificationCode")}</Label>
                  <Input
                    id="lookup-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    className="text-center font-mono text-2xl tracking-[0.5em]"
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full rounded-none font-mono text-[11px] uppercase tracking-[0.1em]"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  {t("verify")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError(null);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("back")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </FadeUp>
      )}

      {step === "orders" && (
        <FadeUp delay={0.1}>
          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <Package className="h-12 w-12 text-foreground/15" />
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/40">{t("noOrders")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const items = order.order_items ?? [];

                return (
                  <Card key={order.id} className="rounded-none border-t-[2px] border-t-foreground">
                    <CardHeader className="flex flex-col gap-2 border-b border-foreground/10 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="font-mono text-sm font-bold uppercase tracking-[0.1em]">
                          No. {order.id.slice(0, 8).toUpperCase()}
                        </CardTitle>
                        <CardDescription className="font-mono text-[10px] uppercase tracking-[0.1em]">
                          {getLocaleDateStr(order.created_at, locale, order.customer_tz_offset)}
                        </CardDescription>
                      </div>
                      <span className={`inline-block -rotate-1 border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] ${
                        order.status === 'approved' || order.status === 'confirmed' ? 'border-foreground/30 text-foreground/60' :
                        order.status === 'cancelled' ? 'border-destructive/30 text-destructive' :
                        'border-foreground/20 text-foreground/40'
                      }`}>
                        {statusLabel(order.status)}
                      </span>
                    </CardHeader>

                    <CardContent>
                      {items.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="font-semibold">
                                {at("item")}
                              </TableHead>
                              <TableHead className="hidden sm:table-cell text-end font-semibold">
                                {at("orderDate")}
                              </TableHead>
                              <TableHead className="hidden md:table-cell text-end font-semibold">
                                {ct("quantity")}
                              </TableHead>
                              <TableHead className="text-end font-semibold">
                                {at("price")}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => {
                              const productName =
                                item.products?.product_translations?.find(
                                  (tr) => tr.locale === locale
                                )?.name ??
                                item.products?.product_translations?.[0]
                                  ?.name ??
                                "—";
                              const rawImage = item.products?.images?.[0];
                              const image = rawImage?.replace(/\.(mp4|webm|mov)($|\?)/i, ".jpg$2");
                              const seedCount =
                                item.product_variants?.seed_count;

                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="py-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                      {image ? (
                                        <Image
                                          src={image}
                                          alt={productName}
                                          width={64}
                                          height={64}
                                          className="w-16 h-16 rounded-md object-cover shrink-0"
                                        />
                                      ) : (
                                        <div className="flex h-16 w-16 items-center justify-center rounded-md bg-secondary shrink-0">
                                          <Package className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">
                                          {productName}
                                        </p>
                                        {seedCount && (
                                          <p className="text-muted-foreground text-sm truncate">
                                            {seedCount} {pt("seeds")}
                                          </p>
                                        )}
                                        <p className="text-muted-foreground text-xs sm:hidden mt-1">
                                          {getLocaleDateStr(
                                            order.created_at,
                                            locale,
                                            order.customer_tz_offset,
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell text-end">
                                    {getLocaleDateStr(
                                      order.created_at,
                                      locale,
                                      order.customer_tz_offset,
                                    )}
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell text-end">
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className="text-end font-mono text-sm font-medium text-accent">
                                    {formatPrice(
                                      item.unit_price_cents * item.quantity,
                                      locale
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                          <TableFooter className="bg-transparent">
                            <TableRow className="font-semibold hover:bg-transparent md:hidden">
                              <TableCell colSpan={1} />
                              <TableCell className="text-end font-mono text-accent">
                                {formatPrice(order.total_cents, locale)}
                              </TableCell>
                            </TableRow>
                            <TableRow className="font-semibold hover:bg-transparent hidden md:table-row">
                              <TableCell colSpan={3} />
                              <TableCell className="text-end font-mono text-accent">
                                {formatPrice(order.total_cents, locale)}
                              </TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {at("orderCount", { count: 0 })}
                            </span>
                          </div>
                          <span className="font-mono text-sm font-medium text-accent">
                            {formatPrice(order.total_cents, locale)}
                          </span>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="border-t border-foreground/10 pt-4">
                      <Link href={`/${locale}/pedido/${order.id}`}>
                        <Button className="rounded-none font-mono text-[11px] uppercase tracking-[0.1em]">
                          {at("viewDetails")}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </FadeUp>
      )}
    </div>
  );
}
