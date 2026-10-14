"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
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
  {
    id: 5,
    title: "Wireless Headphones",
    price: "$179.99",
    originalPrice: "$229.99",
    image: "https://ui.shadcn.com/placeholder.svg",
    badge: "New",
    href: "#",
  },
  {
    id: 6,
    title: "Laptop Sleeve",
    price: "$34.99",
    image: "https://ui.shadcn.com/placeholder.svg",
    href: "#",
  },
  {
    id: 7,
    title: "Premium Camera",
    price: "$899.99",
    originalPrice: "$1099.99",
    image: "https://ui.shadcn.com/placeholder.svg",
    badge: "Sale",
    href: "#",
  },
  {
    id: 8,
    title: "Mechanical Keyboard",
    price: "$159.99",
    image: "https://ui.shadcn.com/placeholder.svg",
    badge: "New",
    href: "#",
  },
];

export default function ProductListSection5({
  title = "Product list title",
  viewAllHref = "#",
  products = defaultProducts,
}: ProductSectionProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    const updateScrollState = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
      setCurrent(api.selectedScrollSnap());
      setCount(api.scrollSnapList().length);
    };

    updateScrollState();
    api.on("select", updateScrollState);
    api.on("reInit", updateScrollState);

    return () => {
      api.off("select", updateScrollState);
      api.off("reInit", updateScrollState);
    };
  }, [api]);

  const showArrows = canScrollPrev || canScrollNext;

  return (
    <section className="bg-background section-padding-y">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 md:gap-12 md:px-6">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:items-end lg:text-left">
          <h1 className="heading-lg text-foreground">{title}</h1>
          <Button variant="secondary" asChild>
            <Link href={viewAllHref}>View all</Link>
          </Button>
        </div>

        {/* Mobile Carousel - hidden on desktop */}
        <div className="flex flex-col gap-8 lg:hidden">
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent>
              {products.map((product, i) => (
                <CarouselItem
                  key={product.id}
                  className="sm:basis-1/2 md:basis-1/3"
                >
                  <ProductCard1 product={product} priority={i < 2} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          {showArrows && (
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {Array.from({ length: count }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => api?.scrollTo(index)}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      current === index
                        ? "bg-foreground w-8"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2",
                    )}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => api?.scrollPrev()}
                  disabled={!canScrollPrev}
                  className="size-10 rounded-full"
                >
                  <ArrowLeft className="size-4" />
                  <span className="sr-only">Previous slide</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => api?.scrollNext()}
                  disabled={!canScrollNext}
                  className="size-10 rounded-full"
                >
                  <ArrowRight className="size-4" />
                  <span className="sr-only">Next slide</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Grid - hidden on mobile */}
        <div className="hidden lg:grid lg:grid-cols-4 lg:gap-x-4 lg:gap-y-8">
          {products.map((product, i) => (
            <ProductCard1 key={product.id} product={product} priority={i < 4} />
          ))}
        </div>
      </div>
    </section>
  );
}
