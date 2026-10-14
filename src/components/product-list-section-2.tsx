"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import ProductCard1, {
  Product,
} from "@/components/product-card-1";

interface ProductSectionProps {
  title?: string;
  viewAllHref?: string;
  products?: Product[];
}

const defaultProducts: Product[] = [
  {
    id: 1,
    title: "Urban Runner Pro",
    price: "$89.99",
    originalPrice: "$129.99",
    image: "https://ui.shadcn.com/placeholder.svg",
    badge: "Sale",
    href: "#",
  },
  {
    id: 2,
    title: "Travel Explorer Pack",
    price: "$64.99",
    originalPrice: "$89.99",
    image: "https://ui.shadcn.com/placeholder.svg",
    badge: "Sale",
    href: "#",
  },
  {
    id: 3,
    title: "Classic Timepiece",
    price: "$149.99",
    originalPrice: "$249.99",
    image: "https://ui.shadcn.com/placeholder.svg",
    badge: "Sale",
    href: "#",
  },
  {
    id: 4,
    title: "Smart Watch",
    price: "$249.99",
    image: "https://ui.shadcn.com/placeholder.svg",
    href: "#",
  },
];

export default function ProductsSection2({
  title = "Product list title",
  viewAllHref = "#",
  products = defaultProducts,
}: ProductSectionProps) {
  return (
    <section className="bg-background section-padding-y">
      <div className="container-padding-x mx-auto flex w-full max-w-7xl flex-col gap-8 md:gap-12">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:items-end lg:text-left">
          <h1 className="text-foreground heading-lg">{title}</h1>
          <Button variant="secondary" asChild>
            <Link href={viewAllHref}>View all</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, i) => (
            <ProductCard1 key={product.id} product={product} priority={i < 4} />
          ))}
        </div>
      </div>
    </section>
  );
}
