"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  LayoutDashboard,
  MapPin,
  Package,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

interface AccountShellProps {
  children: ReactNode;
  /** Page heading shown above the content area (e.g. "Meus Pedidos") */
  heading?: ReactNode;
  /** Optional eyebrow text (e.g. count) shown under the heading */
  description?: ReactNode;
  /** Optional element rendered to the right of the heading (e.g. CTA buttons) */
  headingActions?: ReactNode;
}

interface NavItem {
  href: (locale: string) => string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Match the section this item represents — useful when href is in a different
   *  segment (e.g. /meus-pedidos lives outside /conta but is rendered here). */
  match: (pathname: string, locale: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: (l) => `/${l}/conta`,
    label: "overview",
    icon: LayoutDashboard,
    match: (p, l) => p === `/${l}/conta` || p === `/${l}/conta/`,
  },
  {
    href: (l) => `/${l}/conta/endereco`,
    label: "address",
    icon: MapPin,
    match: (p, l) => p.startsWith(`/${l}/conta/endereco`),
  },
  {
    href: (l) => `/${l}/meus-pedidos`,
    label: "orders",
    icon: Package,
    match: (p, l) => p.startsWith(`/${l}/meus-pedidos`),
  },
];

export function AccountShell({
  children,
  heading,
  description,
  headingActions,
}: AccountShellProps) {
  const t = useTranslations("account");
  const locale = useLocale();
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);

  const fullName =
    user?.fullName ??
    user?.firstName ??
    user?.username ??
    user?.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    "";
  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";
  const avatarUrl = user?.imageUrl ?? undefined;

  const navList = (
    <ul className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname, locale);
        const Icon = item.icon;
        return (
          <li key={item.label}>
            <Link
              href={item.href(locale)}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-foreground/5 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t(`nav.${item.label}`)}</span>
            </Link>
          </li>
        );
      })}
      <li className="pt-2">
        <button
          type="button"
          onClick={() => signOut({ redirectUrl: `/${locale}` })}
          className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{t("nav.signOut")}</span>
        </button>
      </li>
    </ul>
  );

  return (
    <div className="bg-secondary/30 min-h-[calc(100vh-4rem)]">
      {/* Account header strip */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
              <AvatarFallback className="font-mono text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
                {fullName || t("title")}
              </h1>
              {email && (
                <p className="truncate text-sm text-muted-foreground">
                  {email}
                </p>
              )}
            </div>
          </div>
          {/* Mobile sidebar toggle */}
          <Button
            variant="outline"
            size="sm"
            className="self-start md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="account-mobile-nav"
          >
            {mobileOpen ? (
              <X className="mr-2 h-4 w-4" />
            ) : (
              <Menu className="mr-2 h-4 w-4" />
            )}
            {t("nav.menu")}
          </Button>
        </div>
        {/* Mobile collapsible nav */}
        {mobileOpen && (
          <div
            id="account-mobile-nav"
            className="border-t border-border px-4 py-3 md:hidden"
          >
            {navList}
          </div>
        )}
      </div>

      {/* Layout body */}
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:px-6 md:py-10">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-24">{navList}</div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {(heading || headingActions) && (
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                {heading && (
                  <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
                    {heading}
                  </h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              {headingActions && (
                <div className="flex flex-wrap gap-2">{headingActions}</div>
              )}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
