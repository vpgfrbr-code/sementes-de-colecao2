import { HeroSkeleton } from "@/components/skeletons/hero-skeleton";
import { ProductGridSkeleton } from "@/components/skeletons/product-grid-skeleton";

export default function HomeLoading() {
  return (
    <>
      <HeroSkeleton />
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <ProductGridSkeleton count={8} />
      </div>
    </>
  );
}
