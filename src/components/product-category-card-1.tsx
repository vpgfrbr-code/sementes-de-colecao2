import Image from "next/image";
import Link from "next/link";

export interface ProductCategory {
  id: number;
  tagline: string;
  headline: string;
  image: string;
  href: string;
}

interface ProductCategoryCardProps {
  category: ProductCategory;
}

export default function ProductCategoryCard1({
  category,
}: ProductCategoryCardProps) {
  return (
    <Link href={category.href} className="group block h-full">
      <div className="relative h-full overflow-hidden">
        <div className="relative h-full w-full overflow-hidden">
          <Image
            src={category.image}
            alt={category.headline}
            fill
            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute right-0 bottom-0 left-0 p-6">
          <p className="text-sm font-medium text-white/90">
            {category.tagline}
          </p>
          <h3 className="text-2xl font-semibold text-white">
            {category.headline}
          </h3>
        </div>
      </div>
    </Link>
  );
}
