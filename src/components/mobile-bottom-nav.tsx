"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Globe,
  House,
  LogIn,
  LogOut,
  Moon,
  ShoppingBag,
  Store,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { useCartStore } from "@/store/cart";
import { useHydration } from "@/hooks/use-hydration";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";

export function MobileBottomNav() {
  const locale = useLocale();
  const t = useTranslations("common");
  const st = useTranslations("shop");
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const hydrated = useHydration();
  const totalItems = useCartStore((s) => s.totalItems);
  const count = hydrated ? totalItems() : 0;
  const [open, setOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const isAdminRoute = pathname.includes("/admin");

  // Hide on admin routes (admin has its own bottom nav)
  if (isAdminRoute) return null;

  function switchLocale(newLocale: string) {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
    setOpen(false);
  }

  function isActive(href: string) {
    const full = `/${locale}${href}`;
    if (href === "") return pathname === `/${locale}` || pathname === `/${locale}/`;
    return pathname.startsWith(full);
  }

  const navTabs = [
    { href: "", label: t("home"), icon: House },
    { href: "/loja", label: st("title"), icon: Store },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden border-t border-foreground/10 bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {/* Home + Loja tabs */}
        {navTabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={`/${locale}${tab.href}`}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                active ? "text-foreground font-bold" : "text-foreground/70"
              }`}
            >
              <tab.icon className="size-5" />
              {tab.label}
            </Link>
          );
        })}

        {/* Cart tab — opens drawer */}
        <CartDrawer
          open={cartOpen}
          onOpenChange={setCartOpen}
          trigger={
            <button
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                cartOpen ? "text-foreground font-bold" : "text-foreground/70"
              }`}
            >
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="absolute right-1/4 top-1 flex size-4 items-center justify-center bg-foreground font-mono text-[8px] font-bold text-background">
                  {count > 99 ? "99+" : count}
                </span>
              )}
              {t("cart")}
            </button>
          }
        />

        {/* Conta tab — opens settings sheet */}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <button
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                isActive("/conta") || open
                  ? "text-foreground font-bold"
                  : "text-foreground/70"
              }`}
            >
              <User className="size-5" />
              {t("account")}
            </button>
          </DrawerTrigger>
          <DrawerContent
            className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
          >
            <DrawerTitle className="sr-only">{t("account")}</DrawerTitle>
            <div className="flex flex-col gap-4 p-4">
              {/* Language selector */}
              <div>
                <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/70">
                  <Globe className="mr-1.5 inline size-3" />
                  {t("language")}
                </p>
                <div className="flex gap-2">
                  {(["pt", "en", "es"] as const).map((loc) => (
                    <button
                      key={loc}
                      onClick={() => switchLocale(loc)}
                      className={`flex-1 border-2 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] transition-colors ${
                        locale === loc
                          ? "border-foreground bg-foreground/5 text-foreground"
                          : "border-foreground/20 text-foreground/70"
                      }`}
                    >
                      {loc.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dark mode toggle */}
              <button
                onClick={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
                className="flex items-center justify-between border border-foreground/20 px-4 py-3"
              >
                <span className="font-mono text-xs font-bold uppercase tracking-[0.1em]">
                  {resolvedTheme === "dark" ? t("lightMode") : t("darkMode")}
                </span>
                {resolvedTheme === "dark" ? (
                  <Sun className="size-4 text-foreground/60" />
                ) : (
                  <Moon className="size-4 text-foreground/60" />
                )}
              </button>

              {/* Auth links */}
              {isSignedIn ? (
                <>
                  <Link
                    href={`/${locale}/conta`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 border border-foreground/20 px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.1em]"
                  >
                    <User className="size-4 text-foreground/60" />
                    {t("account")}
                  </Link>
                  <Link
                    href={`/${locale}/meus-pedidos`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 border border-foreground/20 px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.1em]"
                  >
                    <ShoppingBag className="size-4 text-foreground/60" />
                    {t("myOrders")}
                  </Link>
                  {(user?.publicMetadata as { role?: string })?.role ===
                    "admin" && (
                    <Link
                      href={`/${locale}/admin`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 border border-foreground/20 px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.1em]"
                    >
                      <Store className="size-4 text-foreground/60" />
                      {t("admin")}
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setOpen(false);
                      signOut();
                    }}
                    className="flex items-center gap-3 border border-destructive/30 px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.1em] text-destructive"
                  >
                    <LogOut className="size-4" />
                    {t("signOut")}
                  </button>
                </>
              ) : (
                <Link
                  href={`/${locale}/sign-in`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 bg-foreground px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.1em] text-background"
                >
                  <LogIn className="size-4" />
                  {t("signIn")}
                </Link>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
}
