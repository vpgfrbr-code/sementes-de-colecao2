"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import ProductCategoryCard1, {
  ProductCategory,
} from "@/components/product-category-card-1";

interface ProductCategorySectionProps {
  title?: string;
  viewAllHref?: string;
  categories?: ProductCategory[];
}

const defaultCategories: ProductCategory[] = [
  {
    id: 1,
    tagline: "New Collection",
    headline: "Men's Apparel",
    image: "https://ui.shadcn.com/placeholder.svg",
    href: "#",
  },
  {
    id: 2,
    tagline: "Summer Essentials",
    headline: "Women's Fashion",
    image: "https://ui.shadcn.com/placeholder.svg",
    href: "#",
  },
  {
    id: 3,
    tagline: "Trending Now",
    headline: "Accessories",
    image: "https://ui.shadcn.com/placeholder.svg",
    href: "#",
  },
  {
    id: 4,
    tagline: "Best Sellers",
    headline: "Footwear",
    image: "https://ui.shadcn.com/placeholder.svg",
    href: "#",
  },
];

export default function ProductCategorySection1({
  title = "Shop by Category",
  viewAllHref = "#",
  categories = defaultCategories,
}: ProductCategorySectionProps) {
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

  const scrollPrev = () => api?.scrollPrev();
  const scrollNext = () => api?.scrollNext();

  return (
    <section className="bg-background section-padding-y">
      <div className="container-padding-x mx-auto flex w-full max-w-7xl flex-col gap-8 md:gap-12">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:items-end lg:text-left">
          <h2 className="text-foreground heading-lg">{title}</h2>
          <Button variant="secondary" asChild>
            <Link href={viewAllHref}>View all</Link>
          </Button>
        </div>

        <div className="flex flex-col gap-8">
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent>
              {categories.map((category) => (
                <CarouselItem
                  key={category.id}
                  className="sm:basis-1/2 lg:basis-1/3"
                >
                  <div className="aspect-[3/4]">
                    <ProductCategoryCard1 category={category} />
                  </div>
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
                  onClick={scrollPrev}
                  disabled={!canScrollPrev}
                  className="size-10 rounded-full"
                >
                  <ArrowLeft className="size-4" />
                  <span className="sr-only">Previous slide</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={scrollNext}
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
      </div>
    </section>
  );
}
