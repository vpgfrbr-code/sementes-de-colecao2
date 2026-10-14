"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import {
  PRIMARY_NAV,
  SECONDARY_NAV,
  SUPERADMIN_NAV,
  type AdminNavItem,
} from "./nav-config";

interface AdminMenuDrawerProps {
  locale: string;
  role?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Menu mobile do admin: bottom sheet com grid de todos os destinos —
 * substitui o antigo "Mais" que abria o sidebar desktop num Sheet lateral.
 */
export function AdminMenuDrawer({
  locale,
  role,
  open,
  onOpenChange,
}: AdminMenuDrawerProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  const groups: { label: string; items: AdminNavItem[] }[] = [
    { label: "Operação", items: PRIMARY_NAV },
    { label: "Conteúdo", items: SECONDARY_NAV },
    ...(role === "superadmin"
      ? [{ label: "Sistema", items: SUPERADMIN_NAV }]
      : []),
  ];

  function isActive(href: string) {
    const full = `/${locale}${href}`;
    return href === "/admin" ? pathname === full : pathname.startsWith(full);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-2xl">
        <DrawerHeader className="pb-1">
          <DrawerTitle>Menu</DrawerTitle>
          <DrawerDescription className="sr-only">
            Navegação completa do painel admin
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {groups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-2 px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={`/${locale}${item.href}`}
                      onClick={() => {
                        haptic("tick");
                        onOpenChange(false);
                      }}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-center transition-colors",
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "bg-card text-foreground/80 hover:bg-secondary active:bg-secondary"
                      )}
                    >
                      <item.icon className="size-5" aria-hidden />
                      <span className="text-[11px] font-medium leading-tight">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-1 flex items-center gap-2 border-t pt-3">
            <Link
              href={`/${locale}`}
              onClick={() => onOpenChange(false)}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border bg-card px-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Voltar ao site
            </Link>
            <button
              type="button"
              onClick={() => {
                haptic("tick");
                setTheme(resolvedTheme === "dark" ? "light" : "dark");
              }}
              aria-label={
                resolvedTheme === "dark"
                  ? "Mudar para tema claro"
                  : "Mudar para tema escuro"
              }
              className="flex size-11 items-center justify-center rounded-xl border bg-card text-foreground/80 transition-colors hover:bg-secondary"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="size-4" aria-hidden />
              ) : (
                <Moon className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
