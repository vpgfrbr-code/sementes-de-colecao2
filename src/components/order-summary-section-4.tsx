import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, PackageIcon, TruckIcon, HomeIcon } from "lucide-react";

const orderItems = [
  {
    id: 1,
    name: "Organic Cotton T-Shirt",
    variant: "Sage Green / Large",
    quantity: 2,
    price: "$45.00",
    image: "https://ui.shadcn.com/placeholder.svg",
  },
  {
    id: 2,
    name: "Linen Blend Trousers",
    variant: "Navy / 32",
    quantity: 1,
    price: "$89.00",
    image: "https://ui.shadcn.com/placeholder.svg",
  },
  {
    id: 3,
    name: "Recycled Wool Cardigan",
    variant: "Oatmeal / Medium",
    quantity: 1,
    price: "$125.00",
    image: "https://ui.shadcn.com/placeholder.svg",
  },
];

const orderTimeline = [
  {
    id: 1,
    label: "Order placed",
    date: "Mar 21",
    completed: true,
    icon: CheckIcon,
  },
  {
    id: 2,
    label: "Processing",
    date: "Mar 22",
    completed: true,
    icon: PackageIcon,
  },
  {
    id: 3,
    label: "Shipped",
    date: "Mar 23",
    completed: true,
    icon: TruckIcon,
  },
  {
    id: 4,
    label: "Delivered",
    date: "Est. Mar 26",
    completed: false,
    icon: HomeIcon,
  },
];

interface OrderSummarySection4Props {
  orderNumber?: string;
  orderDate?: string;
  items?: typeof orderItems;
  timeline?: typeof orderTimeline;
  deliveryAddress?: string;
  billingAddress?: string;
  paymentMethod?: {
    type: string;
    last4: string;
  };
  email?: string;
  subtotal?: string;
  shipping?: string;
  taxes?: string;
  total?: string;
}

export default function OrderSummarySection4({
  orderNumber = "ORD-78432",
  orderDate = "March 21, 2025",
  items = orderItems,
  timeline = orderTimeline,
  deliveryAddress = "2847 Pine Ridge Drive, Austin, TX 78701",
  billingAddress = "2847 Pine Ridge Drive, Austin, TX 78701",
  paymentMethod = {
    type: "Apple Pay",
    last4: "9021",
  },
  email = "emma.wilson@example.com",
  subtotal = "$304.00",
  shipping = "Free",
  taxes = "$25.08",
  total = "$329.08",
}: OrderSummarySection4Props) {
  return (
    <section className="bg-background py-12 md:py-16">
      <div className="container-padding-x mx-auto max-w-4xl">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="heading-md">Order {orderNumber}</h1>
              <Badge variant="secondary">In Transit</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Placed on {orderDate} · Confirmation sent to {email}
            </p>
          </div>

          {/* Timeline - Vertical on mobile, horizontal on desktop */}
          <div className="bg-muted/40 rounded-xl p-6">
            {/* Mobile: Vertical timeline */}
            <div className="flex flex-col gap-4 md:hidden">
              {timeline.map((step, index) => (
                <div key={step.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                        step.completed
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <step.icon className="size-5" />
                    </div>
                    {index < timeline.length - 1 && (
                      <div
                        className={`mt-2 h-8 w-0.5 ${
                          timeline[index + 1]!.completed
                            ? "bg-primary"
                            : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex flex-col pt-2">
                    <span
                      className={`text-sm font-medium ${
                        step.completed
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {step.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Horizontal timeline */}
            <div className="hidden md:block">
              <div className="relative flex items-start justify-between">
                {timeline.map((step, index) => (
                  <div
                    key={step.id}
                    className={`relative z-10 flex flex-col items-center gap-2 ${
                      index === 0
                        ? "items-start"
                        : index === timeline.length - 1
                          ? "items-end"
                          : "items-center"
                    }`}
                  >
                    <div
                      className={`flex size-10 items-center justify-center rounded-full ${
                        step.completed
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <step.icon className="size-5" />
                    </div>
                    <div
                      className={`flex flex-col ${
                        index === 0
                          ? "items-start"
                          : index === timeline.length - 1
                            ? "items-end"
                            : "items-center"
                      }`}
                    >
                      <span
                        className={`text-xs font-medium ${
                          step.completed
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {step.date}
                      </span>
                    </div>
                  </div>
                ))}
                {/* Connector line */}
                <div className="absolute top-5 right-5 left-5 h-0.5 -translate-y-1/2">
                  <div className="bg-border h-full w-full" />
                  <div
                    className="bg-primary absolute top-0 left-0 h-full"
                    style={{
                      width: `${
                        ((timeline.filter((s) => s.completed).length - 1) /
                          (timeline.length - 1)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="flex flex-col">
            <div className="border-border border-b pb-3">
              <h2 className="heading-sm">Items ({items.length})</h2>
            </div>
            <div className="divide-border divide-y">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-4">
                  <div className="relative size-16 shrink-0 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {item.variant}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Qty: {item.quantity}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{item.price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Details Grid */}
          <div className="flex flex-col items-stretch gap-4 md:flex-row md:gap-6">
            <div className="flex flex-1 flex-col gap-1.5">
              <h3 className="text-sm font-medium">Shipping address</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {deliveryAddress}
              </p>
            </div>
            <div className="bg-border my-auto h-px w-full md:h-20 md:w-px" />
            <div className="flex flex-1 flex-col gap-1.5">
              <h3 className="text-sm font-medium">Billing address</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {billingAddress}
              </p>
            </div>
            <div className="bg-border my-auto h-px w-full md:h-20 md:w-px" />
            <div className="flex flex-1 flex-col gap-1.5">
              <h3 className="text-sm font-medium">Payment</h3>
              <div className="text-muted-foreground flex flex-col gap-0.5">
                <p className="text-sm">
                  {paymentMethod.type}, Ending in {paymentMethod.last4}
                </p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-border bg-card rounded-xl border p-6">
            <h2 className="heading-sm mb-4">Order Summary</h2>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{subtotal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-green-600">{shipping}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Taxes</span>
                <span>{taxes}</span>
              </div>
              <div className="border-border mt-2 flex items-center justify-between border-t pt-4">
                <span className="text-base font-semibold">Total</span>
                <span className="text-base font-semibold">{total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
