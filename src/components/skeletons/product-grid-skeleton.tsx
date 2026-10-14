import { ProductCardSkeleton } from "./product-card-skeleton";

interface ProductGridSkeletonProps {
  count?: number;
  columns?: "3" | "4";
}

export function ProductGridSkeleton({
  count = 8,
  columns = "4",
}: ProductGridSkeletonProps) {
  return (
    <div
      className={
        columns === "3"
          ? "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
          : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
