import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="border-t-[2px] border-t-foreground bg-card">
      {/* Image area */}
      <Skeleton className="aspect-[4/5] w-full" />

      {/* Text content */}
      <div className="space-y-2.5 p-3">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}
