import { Archivo, Space_Mono } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ClerkProvider } from "@clerk/nextjs";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ExchangeRateProvider } from "@/lib/exchange-rate";
import { UserPreferencesProvider, type SupportedLanguage } from "@/lib/user-preferences";
import { DeferredChrome } from "@/components/deferred-chrome";
import { Preloader } from "@/components/preloader";
import { getWelcomeCouponPromo } from "@/lib/app-settings";
import { getBrandingSettings } from "@/lib/branding";
import { BrandingProvider } from "@/lib/branding-context";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();
  const headersList = await headers();
  const suggestedCountry =
    headersList.get("x-vercel-ip-country") ??
    headersList.get("cf-ipcountry") ??
    null;
  const welcomePromo = await getWelcomeCouponPromo();
  const branding = await getBrandingSettings();

  return (
    <html
      lang={locale}
      className={`${archivo.variable} ${spaceMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <BrandingProvider value={branding}>
          <Preloader />
          <ClerkProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <NextIntlClientProvider messages={messages}>
                <ExchangeRateProvider>
                  <UserPreferencesProvider
                    currentLocale={locale as SupportedLanguage}
                    suggestedCountry={suggestedCountry}
                  >
                    <SiteHeader />
                    <main className="flex-1 pt-16 pb-safe-nav md:pt-20">{children}</main>
                    <SiteFooter />
                    <MobileBottomNav />
                    <DeferredChrome welcomePromo={welcomePromo} />
                  </UserPreferencesProvider>
                </ExchangeRateProvider>
              </NextIntlClientProvider>
            </ThemeProvider>
          </ClerkProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
