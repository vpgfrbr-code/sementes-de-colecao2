import type { Viewport } from "next";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AdminAppSidebar } from "./_shell/admin-app-sidebar";
import { AdminSiteHeader } from "./_shell/admin-site-header";
import { AdminBottomNav } from "./_shell/admin-bottom-nav";
import { AdminFooter } from "./_components/admin-footer";
import { AdminSaveProvider } from "./_components/admin-save-context";
import { AdminUnsavedGuard } from "./_components/admin-unsaved-guard";
import { AdminMobileSaveBar } from "./_components/admin-mobile-save-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// `viewportFit: "cover"` ativa as env(safe-area-inset-*) no iOS — sem isso
// todos os paddings de safe-area do shell valem 0 em aparelhos com notch.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Hex equivalente ao --background (oklch) do globals.css.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#262624" },
  ],
};

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId } = await auth();
  const { locale } = await params;

  if (!userId) {
    redirect(`/${locale}/sign-in`);
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = (user.publicMetadata as { role?: string })?.role;

  if (role !== "admin" && role !== "superadmin") {
    redirect(`/${locale}`);
  }

  // Persisted desktop sidebar state (set by sidebar.tsx via document.cookie).
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarCookie !== "false";

  return (
    <AdminSaveProvider>
      <AdminUnsavedGuard />
      {/* Negate the locale layout's top/bottom padding so the admin shell takes the full viewport. */}
      <div className="admin-shell -mt-16 md:-mt-20 -mb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:mb-0">
        <SidebarProvider defaultOpen={defaultOpen}>
          <AdminAppSidebar locale={locale} role={role} />
          <SidebarInset>
            <AdminSiteHeader locale={locale} />
            <main className="flex flex-1 flex-col">
              <div className="flex-1 p-4 pb-28 md:p-6 md:pb-8 lg:p-8">
                {children}
              </div>
              <AdminFooter />
            </main>
          </SidebarInset>
          <AdminBottomNav locale={locale} role={role} />
        </SidebarProvider>
      </div>
      <AdminMobileSaveBar />
    </AdminSaveProvider>
  );
}
