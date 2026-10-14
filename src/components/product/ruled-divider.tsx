import { cn } from "@/lib/utils";

interface RuledDividerProps {
  variant?: "thin" | "thick" | "dashed" | "ornamental";
  className?: string;
}

export function RuledDivider({ variant = "thin", className }: RuledDividerProps) {
  if (variant === "ornamental") {
    return (
      <div className={cn("flex items-center gap-3 py-1", className)}>
        <div className="h-px flex-1 bg-foreground/10" />
        <div className="flex items-center gap-1.5">
          <div className="h-px w-3 bg-foreground/25" />
          <div className="size-1 rounded-full bg-foreground/25" />
          <div className="h-px w-3 bg-foreground/25" />
        </div>
        <div className="h-px flex-1 bg-foreground/10" />
      </div>
    );
  }

  if (variant === "thick") {
    return (
      <div className={cn("flex items-center", className)}>
        <div className="h-px flex-1 bg-foreground/10" />
        <div className="h-[2px] w-16 bg-foreground/30" />
        <div className="h-px flex-1 bg-foreground/10" />
      </div>
    );
  }

  if (variant === "dashed") {
    return (
      <div
        className={cn("h-px w-full", className)}
        style={{
          backgroundImage: "repeating-linear-gradient(90deg, var(--color-foreground) 0, var(--color-foreground) 4px, transparent 4px, transparent 8px)",
          opacity: 0.15,
        }}
      />
    );
  }

  return <div className={cn("h-px w-full bg-foreground/10", className)} />;
}
