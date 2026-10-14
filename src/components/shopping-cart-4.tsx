"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

const products = [
  {
    id: 1,
    name: "Urban Runner Pro",
    href: "#",
    price: 89.99,
    color: "Navy Blue",
    size: "US 10",
    quantity: 1,
    imageSrc: "https://ui.shadcn.com/placeholder.svg",
    imageAlt:
      "Lightweight running shoes with premium cushioning and breathable mesh upper.",
  },
  {
    id: 2,
    name: "Classic Timepiece",
    href: "#",
    price: 149.99,
    color: "Silver",
    size: "42mm",
    quantity: 1,
    imageSrc: "https://ui.shadcn.com/placeholder.svg",
    imageAlt:
      "Elegant minimalist watch with stainless steel case and genuine leather strap.",
  },
  {
    id: 3,
    name: "Travel Explorer Pack",
    href: "#",
    price: 64.99,
    color: "Charcoal Gray",
    quantity: 2,
    imageSrc: "https://ui.shadcn.com/placeholder.svg",
    imageAlt:
      "Durable waterproof backpack with multiple compartments and ergonomic design.",
  },
];

export default function ShoppingCart4() {
  const [cartItems, setCartItems] = useState(products);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCartItems(
      cartItems.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item,
      ),
    );
  };

  const removeItem = (id: number) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shipping = 8.0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const freeShippingThreshold = 500;
  const progressToFreeShipping = Math.min(
    (subtotal / freeShippingThreshold) * 100,
    100,
  );
  const amountToFreeShipping = Math.max(freeShippingThreshold - subtotal, 0);

  return (
    <div className="bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Shopping Cart ({totalItems} items)
        </h1>

        <div className="mt-8 lg:grid lg:grid-cols-12 lg:gap-x-12">
          {/* Cart Items */}
          <div className="lg:col-span-7">
            {/* Free Shipping Progress */}
            <div className="bg-muted mb-6 rounded-lg p-4 md:p-6">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium">
                  {progressToFreeShipping === 100 ? (
                    <span className="text-primary">
                      You've qualified for free shipping!
                    </span>
                  ) : (
                    <span>
                      Add ${amountToFreeShipping.toFixed(2)} more for free
                      shipping
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground text-right">
                  ${subtotal.toFixed(2)} / ${freeShippingThreshold.toFixed(2)}
                </span>
              </div>
              <Progress value={progressToFreeShipping} className="h-2" />
            </div>

            {/* Products List */}
            <div className="space-y-4">
              {cartItems.map((product) => (
                <div
                  key={product.id}
                  className="bg-card flex gap-4 rounded-lg border p-4 md:p-6"
                >
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-md">
                    <Image
                      alt={product.imageAlt}
                      src={product.imageSrc}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">
                          <Link href={product.href} className="hover:underline">
                            {product.name}
                          </Link>
                        </h3>
                        <div className="mt-1 flex gap-1 text-sm">
                          <p className="text-muted-foreground">
                            {product.color}
                          </p>
                          {product.size && (
                            <p className="text-muted-foreground">
                              &bull;&nbsp;{product.size}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive -mt-2 -mr-2 size-8"
                        onClick={() => removeItem(product.id)}
                      >
                        <span className="sr-only">Remove</span>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8"
                          onClick={() =>
                            updateQuantity(product.id, product.quantity - 1)
                          }
                          disabled={product.quantity <= 1}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">
                          {product.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8"
                          onClick={() =>
                            updateQuantity(product.id, product.quantity + 1)
                          }
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <p className="text-base font-semibold">
                        ${(product.price * product.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="mt-8 lg:col-span-5 lg:mt-0">
            <div className="bg-muted sticky top-4 rounded-lg p-6">
              <h2 className="text-lg font-semibold">Order Summary</h2>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Subtotal ({totalItems} items)
                  </span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">
                    {progressToFreeShipping === 100 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      `$${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tax (estimated)</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6">
                <Button size="lg" className="w-full">
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
