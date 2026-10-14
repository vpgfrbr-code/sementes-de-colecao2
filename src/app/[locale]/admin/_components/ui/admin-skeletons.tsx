import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Skeletons do admin com as mesmas alturas dos layouts reais — o conteúdo
 * troca sem layout shift. Variantes:
 * - "orders": cards da lista de pedidos (mobile) / tabela (desktop)
 * - "cards": grid de cards de mídia/produto
 * - "table": linhas de tabela genéricas
 * - "grid": grid 2-3 colunas de cards simples (categorias, seed banks…)
 */
export function ListPageSkeleton({
  variant = "table",
  count = 6,
}: {
  variant?: "orders" | "cards" | "table" | "grid";
  count?: number;
}) {
  if (variant === "orders") {
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        <Skeleton className="h-11 w-full sm:max-w-md" />
        <div className="space-y-3 md:hidden">
          {Array.from({ length: count }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-11 flex-1" />
                  <Skeleton className="h-11 flex-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="hidden md:block">
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        <Skeleton className="h-11 w-full sm:max-w-md" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }).map((_, i) => (
            <Card key={i} className="gap-0 overflow-hidden py-0">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex justify-end gap-2 pt-1">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-11" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-2/3" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <div className="flex justify-end gap-2 pt-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-11" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // "table"
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <Card>
        <CardContent className="space-y-4 p-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="size-10 shrink-0 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

/** Skeleton de página de detalhe (pedido, produto…). */
export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-9 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-px w-full" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Skeleton do dashboard: espelha MiniCards + sparkline + listas. */
export function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              {i === 0 ? (
                <Skeleton className="h-[120px] w-full" />
              ) : (
                Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="size-6 shrink-0 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
