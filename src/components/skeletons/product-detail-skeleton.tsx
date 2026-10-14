import { Skeleton } from "@/components/ui/skeleton";

export function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        {/* Image gallery area */}
        <div>
          <Skeleton className="aspect-[4/5] w-full" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-16 shrink-0" />
            ))}
          </div>
        </div>

        {/* Product info area */}
        <div className="space-y-6">
          {/* Breadcrumb */}
          <Skeleton className="h-3 w-40" />

          {/* Title */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>

          {/* Price */}
          <Skeleton className="h-7 w-28" />

          {/* Divider */}
          <div className="h-px bg-foreground/10" />

          {/* Description lines */}
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>

          {/* Variant selector */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24 border border-foreground/10" />
              <Skeleton className="h-10 w-24 border border-foreground/10" />
              <Skeleton className="h-10 w-24 border border-foreground/10" />
            </div>
          </div>

          {/* Add to cart button */}
          <Skeleton className="h-12 w-full" />

          {/* Shipping/trust badges */}
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}
