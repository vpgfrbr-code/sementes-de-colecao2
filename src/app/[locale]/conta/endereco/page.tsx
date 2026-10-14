import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { AccountShell } from "@/components/account/account-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AccountDashboard } from "../account-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("addressPage.title") };
}

export default async function AccountAddressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { userId } = await auth();
  if (!userId) redirect(`/${locale}/sign-in`);

  const t = await getTranslations("account");

  return (
    <AccountShell
      heading={t("addressPage.title")}
      description={t("addressPage.description")}
    >
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0 border-b">
          <div className="bg-foreground/5 flex h-9 w-9 items-center justify-center rounded-md">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              {t("billingAddress")}
            </CardTitle>
            <CardDescription>{t("zipHint")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <AccountDashboard />
        </CardContent>
      </Card>
    </AccountShell>
  );
}
