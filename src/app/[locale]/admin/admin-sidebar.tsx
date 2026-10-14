"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  Package,
  Settings,
  Star,
  Store,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: Package },
  { href: "/admin/produtos", label: "Produtos", icon: Boxes },
  { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { href: "/admin/seed-banks", label: "Seed Banks", icon: Store },
  { href: "/admin/cupons", label: "Cupons", icon: Tag },
  { href: "/admin/revendedores", label: "Revendedores", icon: Users },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon },
  { href: "/admin/media", label: "Mídia", icon: LayoutGrid },
  { href: "/admin/destaques", label: "Destaques", icon: Star },
  { href: "/admin/flash-sale", label: "Flash Sale", icon: Zap },
  { href: "/admin/reviews", label: "Avaliações", icon: MessageSquare },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
];
const SUPERADMIN_ITEMS = [
  { href: "/admin/configuracoes", label: "Configura\u00e7\u00f5es", icon: Settings },
];
// Items shown directly in the bottom bar
const BOTTOM_NAV_ITEMS = NAV_ITEMS.slice(0, 4);
// Remaining items go into the "More" sheet
const OVERFLOW_ITEMS = NAV_ITEMS.slice(4);

function NavLinks({ locale, pathname, onNavigate, role }: { locale: string; pathname: string; onNavigate?: () => void; role?: string }) {
  const items = role === "superadmin" ? [...NAV_ITEMS, ...SUPERADMIN_ITEMS] : NAV_ITEMS;
  return (
    <>
      <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-primary-foreground/50">
        Administração
      </p>
      {items.map((item) => {
        const fullHref = `/${locale}${item.href}`;
        const isActive =
          item.href === "/admin"
            ? pathname === fullHref
            : pathname.startsWith(fullHref);

        return (
          <Link
            key={item.href}
            href={fullHref}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-primary-foreground/15 text-primary-foreground font-medium"
                : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AdminSidebar({ locale, role }: { locale: string; role?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const overflowItems = [...OVERFLOW_ITEMS, ...(role === "superadmin" ? SUPERADMIN_ITEMS : [])];

  const isOverflowActive = overflowItems.some((item) => {
    const fullHref = `/${locale}${item.href}`;
    return item.href === "/admin"
      ? pathname === fullHref
      : pathname.startsWith(fullHref);
  });

  return (
    <>
      {/* Mobile bottom navigation bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t bg-bark px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const fullHref = `/${locale}${item.href}`;
          const isActive =
            item.href === "/admin"
              ? pathname === fullHref
              : pathname.startsWith(fullHref);

          return (
            <Link
              key={item.href}
              href={fullHref}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                isActive ? "text-primary-foreground font-medium" : "text-primary-foreground/50"
              }`}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}

        {/* More button */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                isOverflowActive ? "text-primary-foreground font-medium" : "text-primary-foreground/50"
              }`}
            >
              <MoreHorizontal className="size-5" />
              Mais
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-bark border-t-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="grid grid-cols-3 gap-3 p-4">
              {overflowItems.map((item) => {
                const fullHref = `/${locale}${item.href}`;
                const isActive = pathname.startsWith(fullHref);

                return (
                  <Link
                    key={item.href}
                    href={fullHref}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-[11px] transition-colors ${
                      isActive
                        ? "bg-primary-foreground/15 text-primary-foreground font-medium"
                        : "text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                    }`}
                  >
                    <item.icon className="size-6" />
                    {item.label}
                  </Link>
                );
              })}
              {/* Back to site */}
              <Link
                href={`/${locale}`}
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-[11px] text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors"
              >
                <ArrowLeft className="size-6" />
                Voltar
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r bg-bark text-bark-foreground md:block">
        <div className="sticky top-[3.5rem] flex flex-col gap-1 p-4">
          <NavLinks locale={locale} pathname={pathname} role={role} />
        </div>
      </aside>
    </>
  );
}
