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
    category: "Clothing",
    title: "Classic White Shirt",
    description:
      "Premium cotton shirt with modern fit. Perfect for both casual and formal occasions.",
    price: "$49.99",
    originalPrice: "$69.99",
    image: "/store-images/tshirt-1.webp",
    badge: "Sale",
    href: "#",
  },
  {
    id: 2,
    category: "Accessories",
    title: "Leather Crossbody Bag",
    description:
      "Handcrafted genuine leather bag with adjustable strap. Spacious interior with multiple compartments.",
    price: "$89.99",
    originalPrice: "$119.99",
    image: "/store-images/bag.webp",
    badge: "Sale",
    href: "#",
  },
  {
    id: 3,
    category: "Footwear",
    title: "Premium Leather Boots",
    description:
      "Classic leather boots with cushioned insole. Durable construction for everyday wear.",
    price: "$129.99",
    originalPrice: "$179.99",
    image: "/store-images/shoes.webp",
    badge: "Sale",
    href: "#",
  },
];

export default function ProductListSection1({
  title = "Featured products",
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {products.map((product, i) => (
            <ProductCard1 key={product.id} product={product} priority={i < 3} />
          ))}
        </div>
      </div>
    </section>
  );
}
