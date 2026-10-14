"use client";

import { CloudOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AdminErrorStateProps {
  message?: string;
  onRetry: () => void;
  className?: string;
}

export function AdminErrorState({
  message = "Não foi possível carregar os dados.",
  onRetry,
  className,
}: AdminErrorStateProps) {
  return (
    <Card className={cn("border-dashed animate-in fade-in-0 duration-300", className)}>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <CloudOff className="size-7 text-destructive/70" aria-hidden />
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button variant="outline" className="min-h-11 gap-2" onClick={onRetry}>
          <RotateCcw className="size-4" aria-hidden />
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}
