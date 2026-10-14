"use client";

import * as React from "react";
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ImageZoom } from "@/components/image-zoom";

interface ProductImageCarousel3Props {
  images: string[];
  productName: string;
  className?: string;
}

export default function ProductImageCarousel3({
  images,
  productName,
  className,
}: ProductImageCarousel3Props) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <ImageZoom>
                <div className="relative aspect-[4/5] w-full overflow-hidden">
                  <ImageWithSkeleton
                    src={image}
                    alt={`${productName} image ${index + 1}`}
                    fill
                    className="object-cover"
                    priority={index === 0}
                  />
                </div>
              </ImageZoom>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>

      <div className="text-muted-foreground text-center text-sm">
        Image {current} of {count}
      </div>
    </div>
  );
}
