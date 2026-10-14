"use client";

import Link from "next/link";
import { Check, Globe, LogIn, Moon, Package, Shield, Store, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SearchBar } from "@/components/search-bar";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";

import { cn } from "@/lib/utils";
import { useHeaderThemeStore } from "@/store/header-theme";
import { useUserPreferences } from "@/lib/user-preferences";

export function SiteHeader() {
  const locale = useLocale();
  const t = useTranslations("common");
  const st = useTranslations("shop");
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const { country, requestRegionModal } = useUserPreferences();
  const role = (user?.publicMetadata as { role?: string })?.role;
  const isAdmin = role === "admin" || role === "superadmin";
  const isAdminRoute = pathname.includes("/admin");
  const isDark = useHeaderThemeStore((s) => s.darkCount > 0);

  function switchLocale(newLocale: string) {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  }

  // Hide site header entirely on admin routes
  if (isAdminRoute) return null;

  return (
    <header className={cn(
      "fixed top-0 z-50 w-full pointer-events-none transition-colors duration-300",
      isDark ? "text-white" : "text-foreground"
    )}>
      {/* Background container extending further down for a much smoother blur fade */}
      <div className="absolute top-0 left-0 right-0 h-[96px] md:h-[130px] pointer-events-none transition-[background] duration-300">
        <div className={cn(
          "absolute inset-0 bg-gradient-to-b to-transparent transition-[background] duration-300",
          isDark
            ? "from-black/80 via-black/40"
            : "from-background via-background/70"
        )} />
        {/* Single backdrop-blur layer replaces 8-layer ProgressiveBlur for GPU performance */}
        <div className="absolute inset-0 backdrop-blur-sm" style={{ maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)' }} />
      </div>

      <div className="relative z-20 mt-2 flex h-14 w-full items-center justify-between px-6 md:mt-4 md:h-16 md:px-10 pointer-events-auto">
        {/* Logo — always visible */}
        <Link
          href={`/${locale}`}
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
        >
          <BrandLogo
            width={242}
            height={95}
            className={cn(
              "h-10 w-auto md:h-14 drop-shadow-sm transition-[filter] duration-300",
              // When hero is active (isDark): always white.
              // On non-hero pages: black logo (brightness-0), flipped to white
              // in dark mode via the CSS `dark:` variant — applied by next-themes'
              // inline script before hydration, so no flash.
              isDark ? "brightness-0 invert" : "brightness-0 dark:invert"
            )}
            textClassName="text-xl md:text-2xl"
            priority
          />
        </Link>

        {/* Desktop nav items — hidden on mobile */}
        <div className={cn("hidden items-center gap-1.5 md:flex", isDark && "drop-shadow-md")}>
          <Link href={`/${locale}/loja`}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full font-mono text-[11px] uppercase tracking-[0.1em]"
            >
              <Store className="h-4 w-4" />
              {st("title")}
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full font-mono text-[11px] uppercase tracking-[0.1em]"
              >
                <Globe className="h-4 w-4" />
                {country ? `${locale.toUpperCase()} · ${country}` : locale.toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[160px] rounded-none border border-foreground/20 bg-card p-0"
            >
              {(["pt", "en", "es"] as const).map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => switchLocale(lang)}
                  className="justify-between gap-3 rounded-none px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] focus:bg-foreground/5"
                >
                  {lang.toUpperCase()}
                  {locale === lang && <Check className="h-3 w-3 text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() => requestRegionModal()}
                className="gap-3 rounded-none border-t border-foreground/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] focus:bg-foreground/5"
              >
                {t("changeRegion")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <SearchBar />

          {!isSignedIn ? (
            <Link href={`/${locale}/sign-in`}>
              <Button 
                variant="default" 
                size="sm" 
                className="gap-1.5 rounded-full font-mono text-[11px] uppercase tracking-[0.1em]"
              >
                <LogIn className="h-4 w-4" />
                {t("signIn")}
              </Button>
            </Link>
          ) : (
            <>              <Link href={`/${locale}/meus-pedidos`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-full font-mono text-[11px] uppercase tracking-[0.1em]"
                >
                  <Package className="h-4 w-4" />
                  {t("myOrders")}
                </Button>
              </Link>              {isAdmin && (
                <Link href={`/${locale}/admin`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-full font-mono text-[11px] uppercase tracking-[0.1em]"
                  >
                    <Shield className="h-4 w-4" />
                    {t("admin")}
                  </Button>
                </Link>
              )}
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8 rounded-full",
                  },
                }}
              />
            </>
          )}

          <CartDrawer />
        </div>

        {/* Mobile: search & cart */}
        <div className={cn("flex items-center gap-1 md:hidden", isDark && "drop-shadow-md")}>
          <SearchBar />
          <CartDrawer />
        </div>
      </div>
    </header>
  );
}
