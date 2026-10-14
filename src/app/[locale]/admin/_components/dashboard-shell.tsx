"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PullToRefresh } from "../_components/ui/pull-to-refresh";

/** Evento global de refresh do admin — componentes client refazem fetch. */
export const ADMIN_REFRESH_EVENT = "admin:refresh";

function greetingForHour(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Casca client do dashboard: saudação por hora + pull-to-refresh que
 * revalida os server components (router.refresh) e avisa os client
 * components via evento.
 */
export function DashboardShell({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useUser();
  const firstName = user?.firstName;
  // Hora local do admin — saudação é cosmética, não precisa de timezone fixa.
  const greeting = greetingForHour(new Date().getHours());

  async function handleRefresh() {
    window.dispatchEvent(new CustomEvent(ADMIN_REFRESH_EVENT));
    router.refresh();
    // Pequena espera para o spinner ter presença perceptível.
    await new Promise((r) => setTimeout(r, 350));
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {firstName ? `${greeting}, ${firstName}` : greeting}
            </h1>
            <p className="text-muted-foreground text-sm">Visão geral da loja</p>
          </div>
          <Button asChild size="sm" className="h-10 shrink-0 md:h-9">
            <Link href={`/${locale}`} aria-label="Ir para Loja">
              <ExternalLink className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Ir para Loja</span>
            </Link>
          </Button>
        </div>
        {children}
      </div>
    </PullToRefresh>
  );
}
