"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChevronLeft, Loader2, Save } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAdminSave } from "../_components/admin-save-context";
import { SEGMENT_LABELS } from "./nav-config";

interface Crumb {
  label: string;
  href: string;
  isLast: boolean;
}

function buildCrumbs(pathname: string, locale: string): Crumb[] {
  // Strip /<locale>/ prefix and split.
  const parts = pathname.replace(new RegExp(`^/${locale}/?`), "").split("/").filter(Boolean);
  // First part is "admin"; build cumulative paths.
  const crumbs: Crumb[] = [];
  let cumulative = `/${locale}`;
  parts.forEach((segment, idx) => {
    cumulative += `/${segment}`;
    const lower = segment.toLowerCase();
    let label = SEGMENT_LABELS[lower];
    if (!label) {
      // UUID-ish or numeric — show short id.
      const looksLikeId =
        /^[0-9a-f-]{8,}$/i.test(segment) || /^[0-9]+$/.test(segment);
      label = looksLikeId ? `#${segment.slice(0, 8)}` : segment;
    }
    crumbs.push({ label, href: cumulative, isLast: idx === parts.length - 1 });
  });
  return crumbs;
}

export function AdminSiteHeader({ locale }: { locale: string }) {
  const pathname = usePathname();
  const { state, triggerSave } = useAdminSave();
  const crumbs = React.useMemo(
    () => buildCrumbs(pathname, locale),
    [pathname, locale]
  );

  // No mobile, em páginas profundas (ex.: detalhe do pedido), um voltar
  // físico vale mais que o trigger do sidebar.
  const parentCrumb = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;

  return (
    <header className="bg-background sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
      {parentCrumb ? (
        <Link
          href={parentCrumb.href}
          aria-label={`Voltar para ${parentCrumb.label}`}
          className="-ml-1 flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground md:hidden"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      ) : null}
      <SidebarTrigger className={parentCrumb ? "-ml-1 hidden md:flex" : "-ml-1"} />
      <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap overflow-hidden">
          {crumbs.map((c, idx) => (
            <React.Fragment key={c.href}>
              <BreadcrumbItem
                className={
                  // Hide intermediate crumbs on very small screens; always show the last one.
                  c.isLast ? "min-w-0" : "hidden sm:inline-flex"
                }
              >
                {c.isLast ? (
                  <BreadcrumbPage className="truncate">{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={c.href} className="truncate">
                      {c.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {idx < crumbs.length - 1 && (
                <BreadcrumbSeparator className="hidden sm:block" />
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        {state.visible && (
          <>
            {state.dirty && (
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:inline">
                Alterações não salvas
              </span>
            )}
            <Button
              type="button"
              size="sm"
              onClick={triggerSave}
              disabled={!state.dirty || !state.canSave || state.saving}
              className="h-8 rounded-full px-3 text-[11px] uppercase tracking-[0.1em]"
            >
              {state.saving ? (
                <Loader2 className="size-3.5 animate-spin md:mr-1.5" />
              ) : (
                <Save className="size-3.5 md:mr-1.5" />
              )}
              <span className="hidden md:inline">{state.label}</span>
            </Button>
          </>
        )}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="hidden h-8 gap-2 px-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground sm:inline-flex"
        >
          <Link href={`/${locale}`}>
            <ArrowLeft className="size-3.5" />
            <span className="hidden md:inline">Voltar ao site</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
