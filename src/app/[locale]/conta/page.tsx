import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowRight, MapPin, Package, ShoppingBag } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { AccountShell } from "@/components/account/account-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatOrderDateForCustomer } from "@/lib/format-date";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title") };
}

interface SavedAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  const t = await getTranslations("account");
  const supabase = createServerClient();
  const clerk = await clerkClient();

  const [{ count: totalOrders }, { data: lastOrderRow }, user] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("clerk_user_id", userId),
      supabase
        .from("orders")
        .select("created_at, customer_tz_offset")
        .eq("clerk_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      clerk.users.getUser(userId),
    ]);

  const lastOrderLabel = lastOrderRow?.created_at
    ? formatOrderDateForCustomer(
        lastOrderRow.created_at,
        lastOrderRow.customer_tz_offset ?? null,
        locale,
        { withTime: false, withOffsetSuffix: false },
      )
    : t("overview.none");

  const savedAddress =
    ((user.publicMetadata as { billingAddress?: SavedAddress })
      .billingAddress as SavedAddress | undefined) ?? null;

  const addressLines = savedAddress
    ? [
        [savedAddress.street, savedAddress.number]
          .filter(Boolean)
          .join(", "),
        savedAddress.complement,
        savedAddress.neighborhood,
        [savedAddress.city, savedAddress.state]
          .filter(Boolean)
          .join(" / "),
        savedAddress.zip,
      ].filter((s): s is string => Boolean(s && s.trim()))
    : [];

  const stats = [
    {
      label: t("overview.totalOrdersLabel"),
      value: String(totalOrders ?? 0),
      icon: Package,
    },
    {
      label: t("overview.lastOrderLabel"),
      value: lastOrderLabel,
      icon: ShoppingBag,
    },
  ];

  return (
    <AccountShell>
      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="bg-foreground/5 text-foreground flex h-11 w-11 shrink-0 items-center justify-center rounded-md">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 truncate text-lg font-semibold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="bg-foreground/5 flex h-9 w-9 items-center justify-center rounded-md">
              <MapPin className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold">
              {t("overview.savedAddressLabel")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {addressLines.length > 0 ? (
              <div className="text-sm leading-relaxed text-muted-foreground">
                {addressLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("overview.noAddress")}
              </p>
            )}
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href={`/${locale}/conta/endereco`}>
                {t("overview.editAddress")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="bg-foreground/5 flex h-9 w-9 items-center justify-center rounded-md">
              <Package className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold">
              {t("myOrders")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("ordersDescription")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="gap-2">
                <Link href={`/${locale}/meus-pedidos`}>
                  {t("overview.viewAllOrders")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/${locale}`}>{t("overview.shopNow")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AccountShell>
  );
}

