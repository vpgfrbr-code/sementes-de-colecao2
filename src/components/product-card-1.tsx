import Link from "next/link";
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton";
import { Badge } from "@/components/ui/badge";

export interface Product {
  id: number;
  category?: string;
  title: string;
  description?: string;
  price: string;
  originalPrice?: string;
  image: string;
  badge?: string;
  href: string;
}

interface ProductCardProps {
  product: Product;
  /**
   * When true, the image is preloaded eagerly (`priority` +
   * `fetchPriority="high"`). Pass for the first 2-4 cards above the fold so
   * the browser starts downloading them immediately instead of waiting for
   * the lazy-load IntersectionObserver. Required to keep LCP fast on /loja
   * and the homepage product strips.
   */
  priority?: boolean;
}

export default function ProductCard1({ product, priority = false }: ProductCardProps) {
  return (
    <Link href={product.href} className="group flex h-full flex-col gap-4">
      <div className="relative">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg">
          <ImageWithSkeleton
            src={product.image}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
            priority={priority}
            fetchPriority={priority ? "high" : "auto"}
          />
        </div>
        {product.badge && (
          <Badge className="absolute top-4 left-4">{product.badge}</Badge>
        )}
      </div>

      <div className="items-between flex h-full flex-col justify-between gap-2">
        <div className="flex flex-col gap-1">
          {product.category && (
            <p className="text-muted-foreground text-sm">{product.category}</p>
          )}
          <h3 className="text-foreground text-sm font-medium">
            {product.title}
          </h3>
          {product.description && (
            <p className="text-muted-foreground text-sm leading-5">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-foreground text-lg font-medium">
            {product.price}
          </span>
          {product.originalPrice && (
            <span className="text-muted-foreground text-lg line-through">
              {product.originalPrice}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
