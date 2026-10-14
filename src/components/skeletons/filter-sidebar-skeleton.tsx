import { Skeleton } from "@/components/ui/skeleton";

export function FilterSidebarSkeleton() {
  return (
    <div className="w-[260px] shrink-0 space-y-6">
      {/* Search */}
      <Skeleton className="h-10 w-full border border-foreground/10" />

      {/* Filter sections */}
      {Array.from({ length: 4 }).map((_, section) => (
        <div key={section} className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-3 w-full max-w-[140px]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
