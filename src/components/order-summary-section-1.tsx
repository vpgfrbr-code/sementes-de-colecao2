"use client";

import Image from "next/image";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const orderItems = [
  {
    id: 1,
    name: "Wireless Noise-Cancelling Headphones",
    price: "$249.00",
    description:
      "Premium over-ear headphones with active noise cancellation, 30-hour battery life, and studio-quality sound.",
    image: "https://ui.shadcn.com/placeholder.svg",
    deliveryAddress: "742 Evergreen Terrace, Springfield, OR 97477",
    email: "sarah.chen@example.com",
    phone: "(503) 555-0123",
    shippedDate: "March 25, 2025",
    progress: 75,
    progressSteps: ["Order placed", "Processing", "Shipped", "Delivered"],
  },
  {
    id: 2,
    name: "Smart Fitness Watch Pro",
    price: "$329.00",
    description:
      "Advanced fitness tracking with heart rate monitor, GPS, sleep tracking, and 7-day battery life. Water resistant up to 50m.",
    image: "https://ui.shadcn.com/placeholder.svg",
    deliveryAddress: "742 Evergreen Terrace, Springfield, OR 97477",
    email: "sarah.chen@example.com",
    phone: "(503) 555-0123",
    shippedDate: "March 26, 2025",
    progress: 50,
    progressSteps: ["Order placed", "Processing", "Shipped", "Delivered"],
  },
];

interface OrderSummarySection1Props {
  orderNumber?: string;
  orderDate?: string;
  items?: typeof orderItems;
  billingAddress?: string;
  paymentMethod?: {
    type: string;
    last4: string;
    expiry: string;
  };
  subtotal?: string;
  shipping?: string;
  taxes?: string;
  total?: string;
}

export default function OrderSummarySection1({
  orderNumber = "#ORD-2024-7891",
  orderDate = "March 23, 2025",
  items = orderItems,
  billingAddress = "742 Evergreen Terrace, Springfield, OR 97477",
  paymentMethod = {
    type: "Visa",
    last4: "4242",
    expiry: "12/27",
  },
  subtotal = "$578.00",
  shipping = "$15.00",
  taxes = "$52.02",
  total = "$645.02",
}: OrderSummarySection1Props) {
  return (
    <section className="bg-background py-12 md:py-16">
      <div className="container-padding-x mx-auto max-w-5xl">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h1 className="text-lg font-semibold">Order {orderNumber}</h1>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Order placed</span>
              <span>{orderDate}</span>
            </div>
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className="bg-card border-border flex flex-col gap-6 rounded-lg border p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:gap-4">
                <div className="shrink-0">
                  <div className="relative size-20 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-6 lg:flex-row lg:justify-end lg:gap-6">
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                    <h3 className="font-medium">{item.name}</h3>
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">{item.price}</p>
                      <p className="text-muted-foreground text-sm leading-5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 shrink-0 flex-col justify-start gap-2 lg:w-48">
                    <h4 className="font-medium">Delivery address</h4>
                    <p className="text-muted-foreground text-sm leading-5">
                      {item.deliveryAddress}
                    </p>
                  </div>

                  <div className="flex min-w-0 shrink-0 flex-col justify-start gap-2 lg:w-48">
                    <h4 className="font-medium">Shipping updates</h4>
                    <div className="flex flex-col gap-1">
                      <p className="text-muted-foreground text-sm">
                        {item.email}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {item.phone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-4">
                <Progress value={item.progress} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {item.progressSteps.map((step, index) => (
                    <span key={index} className="text-muted-foreground text-xs">
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="bg-muted/40 grid grid-cols-1 gap-6 rounded-lg p-6 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h4 className="font-medium">Billing address</h4>
                <p className="text-muted-foreground text-sm leading-5">
                  {billingAddress}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h4 className="font-medium">Payment information</h4>
                <div className="flex flex-col">
                  <p className="text-sm">
                    Card ending with {paymentMethod.last4}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Express {paymentMethod.expiry}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>Subtotal</span>
                <span>{subtotal}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Shipping</span>
                <span>{shipping}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Taxes</span>
                <span>{taxes}</span>
              </div>
              <div className="border-border flex w-full max-w-md items-center justify-between gap-2 border-t pt-4">
                <span className="text-lg font-medium">Total</span>
                <span className="font-medium">{total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
