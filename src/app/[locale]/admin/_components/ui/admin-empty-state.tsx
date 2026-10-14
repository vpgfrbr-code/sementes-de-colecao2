"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AdminEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <Card className={cn("border-dashed animate-in fade-in-0 duration-300", className)}>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-secondary">
          <Icon className="size-7 text-muted-foreground/50" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
