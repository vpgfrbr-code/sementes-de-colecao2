import { FilterSidebarSkeleton } from "@/components/skeletons/filter-sidebar-skeleton";
import { ProductGridSkeleton } from "@/components/skeletons/product-grid-skeleton";

export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <FilterSidebarSkeleton />
        </div>
        {/* Product grid */}
        <div className="flex-1">
          <ProductGridSkeleton count={9} columns="3" />
        </div>
      </div>
    </div>
  );
}
