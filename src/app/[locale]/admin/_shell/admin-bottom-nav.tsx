"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LayoutGrid } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { AdminMenuDrawer } from "./admin-menu-drawer";
import { BOTTOM_NAV } from "./nav-config";

const PENDING_POLL_MS = 60_000;

/**
 * Tab bar mobile do admin (5 abas): Dashboard, Pedidos (badge de pendentes),
 * Produtos, Relatórios e Menu (drawer com todos os destinos).
 */
export function AdminBottomNav({
  locale,
  role,
}: {
  locale: string;
  role?: string;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);

  // Badge de pedidos pendentes: poll a cada 60s + refetch ao focar a aba.
  React.useEffect(() => {
    let cancelled = false;
    async function fetchCount() {
      try {
        const res = await fetch("/api/admin/orders/pending-count");
        if (!res.ok) return;
        const data: { count: number } = await res.json();
        if (!cancelled) setPendingCount(data.count ?? 0);
      } catch {
        // Badge é informativo — falha de rede não precisa de feedback.
      }
    }
    fetchCount();
    const interval = window.setInterval(fetchCount, PENDING_POLL_MS);
    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  const isActive = React.useCallback(
    (href: string) => {
      const fullHref = `/${locale}${href}`;
      return href === "/admin"
        ? pathname === fullHref
        : pathname.startsWith(fullHref);
    },
    [locale, pathname]
  );

  const anyTabActive = BOTTOM_NAV.some((item) => isActive(item.href));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t bg-background/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Navegação rápida"
      >
        {BOTTOM_NAV.map((item) => {
          const active = isActive(item.href);
          const isPedidos = item.href === "/admin/pedidos";
          return (
            <Link
              key={item.href}
              href={`/${locale}${item.href}`}
              onClick={() => haptic("tick")}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] transition-colors",
                active ? "font-semibold text-primary" : "text-muted-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId={reduceMotion ? undefined : "admin-tab-indicator"}
                  className="absolute top-0 h-0.5 w-10 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  aria-hidden
                />
              )}
              <span className="relative">
                <motion.span
                  className="block"
                  animate={reduceMotion ? undefined : { scale: active ? 1.08 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                >
                  <item.icon className="size-5" aria-hidden />
                </motion.span>
                <AnimatePresence>
                  {isPedidos && pendingCount > 0 && (
                    <motion.span
                      key={pendingCount}
                      initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={reduceMotion ? undefined : { scale: 0.4, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 24 }}
                      className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold leading-none text-primary-foreground"
                      aria-label={`${pendingCount} pedidos pendentes`}
                    >
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => {
            haptic("tick");
            setMenuOpen(true);
          }}
          aria-label="Abrir menu completo"
          className={cn(
            "flex min-h-12 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] transition-colors",
            menuOpen || !anyTabActive
              ? "font-semibold text-primary"
              : "text-muted-foreground"
          )}
        >
          <LayoutGrid className="size-5" aria-hidden />
          <span className="leading-none">Menu</span>
        </button>
      </nav>

      <AdminMenuDrawer
        locale={locale}
        role={role}
        open={menuOpen}
        onOpenChange={setMenuOpen}
      />
    </>
  );
}
