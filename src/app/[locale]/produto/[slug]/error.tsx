"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[produto] route error", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <AlertTriangle className="size-12 text-destructive" aria-hidden />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.1em]">
          Produto indisponível
        </h1>
        <p className="font-mono text-sm text-foreground/75">
          Algo deu errado ao carregar este produto. Tente novamente em instantes.
        </p>
        {error.digest ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/60">
            ref: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} size="lg" className="rounded-full">
          Tentar novamente
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link href="/loja">Ver todos os produtos</Link>
        </Button>
      </div>
    </div>
  );
}
