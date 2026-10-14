"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { BrandLogo } from "@/components/brand-logo";
import {
  ArrowLeft,
  ChevronsUpDown,
  ExternalLink,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PRIMARY_NAV,
  SECONDARY_NAV,
  SUPERADMIN_NAV,
  type AdminNavItem,
} from "./nav-config";

interface AdminAppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  locale: string;
  role?: string;
}

function isActive(pathname: string, fullHref: string, href: string) {
  return href === "/admin"
    ? pathname === fullHref
    : pathname.startsWith(fullHref);
}

function NavGroup({
  label,
  items,
  locale,
  pathname,
}: {
  label: string;
  items: AdminNavItem[];
  locale: string;
  pathname: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const fullHref = `/${locale}${item.href}`;
          const active = isActive(pathname, fullHref, item.href);
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                tooltip={item.label}
                isActive={active}
              >
                <Link href={fullHref} aria-current={active ? "page" : undefined}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export function AdminAppSidebar({
  locale,
  role,
  ...props
}: AdminAppSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isMobile } = useSidebar();

  const userName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Admin";
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const userImage = user?.imageUrl;
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={`/${locale}/admin`} className="gap-3">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-9 items-center justify-center rounded-lg">
                  <BrandLogo
                    width={32}
                    height={32}
                    className="size-6 brightness-0 invert"
                    textClassName="text-xs font-bold leading-none"
                  />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold text-sm">
                    Admin
                  </span>
                  <span className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/60">
                    Painel
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup
          label="Operação"
          items={PRIMARY_NAV}
          locale={locale}
          pathname={pathname}
        />
        <NavGroup
          label="Conteúdo"
          items={SECONDARY_NAV}
          locale={locale}
          pathname={pathname}
        />
        {role === "superadmin" && (
          <NavGroup
            label="Sistema"
            items={SUPERADMIN_NAV}
            locale={locale}
            pathname={pathname}
          />
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Voltar ao site"
              className="text-sidebar-foreground/70"
            >
              <Link href={`/${locale}`}>
                <ArrowLeft />
                <span>Voltar ao site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={userName}
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    {userImage && (
                      <AvatarImage src={userImage} alt={userName} />
                    )}
                    <AvatarFallback className="rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                      {initials || "AD"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      {userEmail}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      {userImage && (
                        <AvatarImage src={userImage} alt={userName} />
                      )}
                      <AvatarFallback className="rounded-lg text-xs">
                        {initials || "AD"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {userName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {userEmail}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}`}>
                    <ExternalLink className="mr-2 size-4" />
                    Ir para a loja
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut()}>
                  <LogOut className="mr-2 size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
