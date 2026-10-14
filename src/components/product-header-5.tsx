"use client";

import * as React from "react";
import { Star, ShoppingCart, Minus, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ProductImageCarousel3 from "@/components/product-image-carousel-3";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  SiFacebook,
  SiInstagram,
  SiX,
  SiWhatsapp,
} from "@icons-pack/react-simple-icons";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import ColorVariantField from "@/components/color-variant-field";

export type ProductData = {
  // Product Information
  productName: string;
  description: string;

  // Pricing
  price: string;
  originalPrice: string;
  discount: string;

  // Reviews & Rating
  rating: number;
  reviewCount: number;

  // Images
  mainImage: string;
  thumbnails: string[];

  // Variants
  colors: Array<{ label: string; value: string; hex: string }>;
  sizes: string[];

  // Breadcrumb Navigation
  breadcrumbs: Array<{ label: string; href: string }>;

  // Product Details Sections
  details: Array<{ value: string; title: string; content: string }>;
};

export const defaultProductData: ProductData = {
  // Product Information
  productName: "Premium Cotton T-Shirt",
  description:
    "Experience ultimate comfort with our premium cotton t-shirt. Made from 100% organic cotton, this versatile piece features a classic fit that looks great on everyone.",

  // Pricing
  price: "$49.99",
  originalPrice: "$69.00",
  discount: "-20%",

  // Reviews & Rating
  rating: 5,
  reviewCount: 128,

  // Images
  mainImage: "https://ui.shadcn.com/placeholder.svg",
  thumbnails: [
    "https://ui.shadcn.com/placeholder.svg",
    "https://ui.shadcn.com/placeholder.svg",
    "https://ui.shadcn.com/placeholder.svg",
    "https://ui.shadcn.com/placeholder.svg",
  ],

  // Variants
  colors: [
    { label: "Black", value: "black", hex: "#000000" },
    { label: "White", value: "white", hex: "#FFFFFF" },
    { label: "Navy", value: "navy", hex: "#1E3A8A" },
    { label: "Gray", value: "gray", hex: "#6B7280" },
  ],
  sizes: ["XS", "S", "M", "L", "XL", "XXL"],

  // Breadcrumb Navigation
  breadcrumbs: [
    { label: "Home", href: "#" },
    { label: "Women", href: "#" },
    { label: "T-shirts", href: "#" },
  ],

  // Product Details Sections
  details: [
    {
      value: "details",
      title: "Details",
      content:
        "Made from premium 100% organic cotton. Features a classic crew neck design, reinforced shoulder seams, and a comfortable regular fit. Pre-shrunk fabric ensures lasting quality wash after wash.",
    },
    {
      value: "shipping",
      title: "Shipping",
      content:
        "Free standard shipping on orders over $50. Express shipping available at checkout. Orders are typically processed within 1-2 business days and delivered within 5-7 business days.",
    },
    {
      value: "returns",
      title: "Returns",
      content:
        "We offer free returns within 30 days of purchase. Items must be unworn, unwashed, and in original condition with tags attached. Refunds are processed within 5-10 business days of receiving your return.",
    },
  ],
};

const sizeGuideData = [
  {
    size: "XS",
    chest: '33-34"',
    waist: '26-27"',
    hips: '35-36"',
    length: '26"',
  },
  {
    size: "S",
    chest: '35-37"',
    waist: '28-29"',
    hips: '37-38"',
    length: '27"',
  },
  {
    size: "M",
    chest: '38-40"',
    waist: '30-32"',
    hips: '39-41"',
    length: '28"',
  },
  {
    size: "L",
    chest: '42-44"',
    waist: '33-35"',
    hips: '42-44"',
    length: '29"',
  },
  {
    size: "XL",
    chest: '46-48"',
    waist: '36-38"',
    hips: '45-47"',
    length: '30"',
  },
  {
    size: "XXL",
    chest: '50-52"',
    waist: '39-41"',
    hips: '48-50"',
    length: '31"',
  },
];

const reviewsData = [
  {
    id: 1,
    author: "Sarah Johnson",
    date: "March 15, 2024",
    rating: 5,
    content:
      "Absolutely love this t-shirt! The fabric is incredibly soft and the fit is perfect. I've washed it multiple times and it still looks brand new. Highly recommend!",
  },
  {
    id: 2,
    author: "Michael Chen",
    date: "March 10, 2024",
    rating: 4,
    content:
      "Great quality cotton shirt. The color is exactly as shown and it's very comfortable. Only minor issue is it shrunk slightly after the first wash, but still fits well.",
  },
  {
    id: 3,
    author: "Emily Rodriguez",
    date: "March 5, 2024",
    rating: 5,
    content:
      "This is my third purchase of this shirt in different colors. The quality is consistent and the price is fair. Perfect for everyday wear!",
  },
  {
    id: 4,
    author: "David Thompson",
    date: "February 28, 2024",
    rating: 3,
    content:
      "Decent shirt overall. The material is good but I found the sizing to be a bit off. I usually wear medium but had to exchange for a large. Once I got the right size, it was fine.",
  },
  {
    id: 5,
    author: "Jessica Williams",
    date: "February 20, 2024",
    rating: 5,
    content:
      "Excellent product! The organic cotton feels amazing against the skin. I love that it's sustainable too. Will definitely buy more colors.",
  },
  {
    id: 6,
    author: "Robert Martinez",
    date: "February 15, 2024",
    rating: 4,
    content:
      "Very comfortable t-shirt with good durability. The classic fit works well for both casual and slightly dressier occasions. Good value for money.",
  },
  {
    id: 7,
    author: "Amanda Lee",
    date: "February 8, 2024",
    rating: 5,
    content:
      "Perfect fit and amazing quality! I've been looking for a good basic t-shirt and this exceeded my expectations. The fabric is breathable and doesn't wrinkle easily.",
  },
  {
    id: 8,
    author: "James Wilson",
    date: "February 1, 2024",
    rating: 2,
    content:
      "Not impressed with this purchase. The shirt arrived with a small defect and the fabric feels thinner than expected. Customer service was helpful with the return though.",
  },
  {
    id: 9,
    author: "Lisa Anderson",
    date: "January 25, 2024",
    rating: 4,
    content:
      "Nice shirt, good quality cotton. The color options are great and it pairs well with everything. Would recommend to friends.",
  },
  {
    id: 10,
    author: "Christopher Brown",
    date: "January 18, 2024",
    rating: 5,
    content:
      "Outstanding quality! This t-shirt has become a staple in my wardrobe. The organic cotton is soft, the construction is solid, and it looks great. Worth every penny!",
  },
  {
    id: 11,
    author: "Michelle Garcia",
    date: "January 12, 2024",
    rating: 4,
    content:
      "Really like this shirt. The fit is true to size and the material feels premium. Only wish there were more color options available.",
  },
  {
    id: 12,
    author: "Daniel Kim",
    date: "January 5, 2024",
    rating: 5,
    content:
      "Best t-shirt I've bought in a while. The quality is exceptional and it's very comfortable. I've already ordered two more in different colors!",
  },
];

// Shuffle array function
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

// Generate randomized reviews
const generateReviews = () => {
  return shuffleArray(reviewsData);
};

// Star Rating Component
function StarRating({
  rating,
  size = "default",
}: {
  rating: number;
  size?: "default" | "small";
}) {
  const starSize = size === "small" ? "size-3" : "size-4";

  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            starSize,
            index < rating ? "fill-current" : "fill-current opacity-20",
          )}
        />
      ))}
    </div>
  );
}

// Review Card Component
function ReviewCard({ review }: { review: (typeof reviewsData)[0] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-none font-semibold">{review.author}</p>
          <p className="text-muted-foreground text-sm leading-none">
            {review.date}
          </p>
        </div>
        <StarRating rating={review.rating} size="small" />
      </div>
      <p className="text-muted-foreground text-sm leading-5">
        {review.content}
      </p>
    </div>
  );
}

interface ProductHeader5Props {
  productName?: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  mainImage?: string;
  thumbnails?: string[];
  colors?: Array<{ label: string; value: string; hex: string }>;
  sizes?: string[];
}

export default function ProductHeader5({
  productName = defaultProductData.productName,
  price = defaultProductData.price,
  originalPrice = defaultProductData.originalPrice,
  discount = defaultProductData.discount,
  description = defaultProductData.description,
  mainImage = defaultProductData.mainImage,
  thumbnails = defaultProductData.thumbnails,
  colors = defaultProductData.colors,
  sizes = defaultProductData.sizes,
}: ProductHeader5Props) {
  const [quantity, setQuantity] = React.useState(1);
  const [selectedColor, setSelectedColor] = React.useState(colors[0]?.value);
  const [selectedSize, setSelectedSize] = React.useState("XS");
  // Start with unshuffled array for SSR compatibility, shuffle on client
  const [reviews, setReviews] = React.useState(reviewsData);
  const reviewsSectionRef = React.useRef<HTMLDivElement>(null);

  // Shuffle reviews only on client side after hydration
  React.useEffect(() => {
    setReviews(generateReviews());
  }, []);

  // Calculate average rating and rating breakdown from reviews
  const averageRating =
    reviews.reduce(
      (sum: number, review: (typeof reviewsData)[0]) => sum + review.rating,
      0,
    ) / reviews.length;
  const roundedRating = Math.round(averageRating * 10) / 10;

  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { stars, percentage: Math.round(percentage) };
  });

  const handleScrollToReviews = () => {
    reviewsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleIncrement = () => {
    setQuantity((prev) => Math.min(prev + 1, 99));
  };

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setQuantity(1);
      return;
    }
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setQuantity(Math.min(Math.max(numValue, 1), 99));
    }
  };

  const handleAddToCart = () => {
    console.log("Adding to cart:", {
      productName,
      quantity,
      color: selectedColor,
      size: selectedSize,
    });
  };

  const handleBuyNow = () => {
    console.log("Buy now:", {
      productName,
      quantity,
      color: selectedColor,
      size: selectedSize,
    });
  };

  return (
    <section className="bg-background pt-8 pb-16">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
          <ProductImageCarousel3
            images={[mainImage, ...thumbnails]}
            productName={productName}
            className="flex-1"
          />

          <div className="flex flex-1 flex-col gap-6 lg:max-w-lg">
            <div className="flex flex-col gap-8">
              <Breadcrumb className="hidden lg:block">
                <BreadcrumbList>
                  {defaultProductData.breadcrumbs.map((item) => (
                    <React.Fragment key={item.label}>
                      <BreadcrumbItem>
                        <BreadcrumbLink href={item.href}>
                          {item.label}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator>
                        <ChevronRight className="size-4" />
                      </BreadcrumbSeparator>
                    </React.Fragment>
                  ))}
                  <BreadcrumbItem>
                    <BreadcrumbPage>{productName}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="flex flex-col gap-5">
                <h1 className="text-foreground heading-md">{productName}</h1>

                <button
                  onClick={handleScrollToReviews}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <StarRating rating={Math.round(averageRating)} />
                  <span className="text-muted-foreground text-sm font-medium hover:underline">
                    ({reviews.length} reviews)
                  </span>
                </button>

                <p className="text-muted-foreground text-base">{description}</p>
              </div>
            </div>

            <FieldGroup>
              <div className="flex items-center gap-2">
                <div className="flex items-end gap-1.5 align-baseline">
                  <span className="text-3xl font-semibold tracking-tight">
                    {price}
                  </span>
                  <span className="text-muted-foreground text-xl font-medium tracking-tight line-through">
                    {originalPrice}
                  </span>
                </div>
                <Badge variant="default" className="rounded-full">
                  {discount}
                </Badge>
              </div>

              <Field>
                <FieldLabel>Color</FieldLabel>
                <ColorVariantField
                  colors={colors}
                  selectedColor={selectedColor}
                  onColorChange={setSelectedColor}
                />
              </Field>

              <Field>
                <FieldLabel>Size</FieldLabel>
                <ToggleGroup
                  type="single"
                  spacing={2}
                  variant="outline"
                  value={selectedSize}
                  onValueChange={(value) => {
                    if (value) setSelectedSize(value);
                  }}
                >
                  {sizes.map((size) => (
                    <ToggleGroupItem key={size} value={size}>
                      {size}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <FieldDescription>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-primary text-sm underline"
                      >
                        View size guide
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Size Guide</DialogTitle>
                        <DialogDescription>
                          Find your perfect fit. All measurements are in inches.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[80px]">Size</TableHead>
                              <TableHead>Chest</TableHead>
                              <TableHead>Waist</TableHead>
                              <TableHead>Hips</TableHead>
                              <TableHead>Length</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sizeGuideData.map((item) => (
                              <TableRow key={item.size}>
                                <TableCell className="font-medium">
                                  {item.size}
                                </TableCell>
                                <TableCell>{item.chest}</TableCell>
                                <TableCell>{item.waist}</TableCell>
                                <TableCell>{item.hips}</TableCell>
                                <TableCell>{item.length}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="border-t pt-4">
                        <p className="text-muted-foreground text-sm">
                          <strong>How to measure:</strong> Use a soft measuring
                          tape. For the most accurate measurements, have someone
                          else measure you. Keep the tape snug but not tight.
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Quantity</FieldLabel>
                <div className="flex gap-3">
                  <ButtonGroup>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDecrement}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={handleQuantityChange}
                      className="w-10 [appearance:textfield] px-0 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      min={1}
                      max={99}
                      aria-label="Quantity"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleIncrement}
                      disabled={quantity >= 99}
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </ButtonGroup>
                  <Button className="flex-1" onClick={handleAddToCart}>
                    <ShoppingCart className="size-4" />
                    Add to cart
                  </Button>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleBuyNow}
                >
                  Buy it now
                </Button>
              </Field>
            </FieldGroup>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium">Share</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Share on Facebook"
                  >
                    <SiFacebook className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Share on Instagram"
                  >
                    <SiInstagram className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Share on X">
                    <SiX className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Share on WhatsApp"
                  >
                    <SiWhatsapp className="size-4" />
                  </Button>
                </div>
              </div>

              {defaultProductData.details.map((item) => (
                <div key={item.value} className="flex flex-col gap-2">
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
            <div
              ref={reviewsSectionRef}
              id="reviews-section"
              className="flex w-full flex-col gap-6"
            >
              <div className="flex flex-col gap-3">
                <h2 className="text-lg leading-7 font-semibold">Reviews</h2>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none font-semibold">
                      {roundedRating}
                    </span>
                    <StarRating rating={Math.round(averageRating)} />
                  </div>
                  <span className="text-muted-foreground text-sm font-medium">
                    {reviews.length} reviews
                  </span>
                </div>
              </div>

              <Separator />

              <ReviewCard review={reviews[0]!} />
              <Separator />
              <ReviewCard review={reviews[1]!} />

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    View all reviews
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-[511px] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>All reviews</DialogTitle>
                  </DialogHeader>

                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none font-semibold">
                            {roundedRating}
                          </span>
                          <StarRating rating={Math.round(averageRating)} />
                        </div>
                        <span className="text-muted-foreground text-sm font-medium">
                          {reviews.length} reviews
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        {ratingBreakdown.map((item) => (
                          <div
                            key={item.stars}
                            className="flex items-center gap-2"
                          >
                            <div className="flex min-w-[26px] items-center gap-1">
                              <span className="text-sm leading-5 font-medium">
                                {item.stars}
                              </span>
                              <Star className="size-3 fill-current" />
                            </div>
                            <Progress
                              value={item.percentage}
                              className="h-1 flex-1"
                            />
                            <span className="text-muted-foreground min-w-[36px] text-sm leading-5">
                              {item.percentage}%
                            </span>
                          </div>
                        ))}
                      </div>

                      <p className="text-muted-foreground text-sm leading-5">
                        Based on {reviews.length} verified customer reviews. All
                        reviews are from verified purchasers.
                      </p>
                    </div>

                    <Separator />

                    {reviews.map((review, index) => (
                      <div key={review.id}>
                        <ReviewCard review={review} />
                        {index < reviews.length - 1 && (
                          <Separator className="mt-6" />
                        )}
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
