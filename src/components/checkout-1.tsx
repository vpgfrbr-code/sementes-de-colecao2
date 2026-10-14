"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

const products = [
  {
    id: 1,
    title: "Urban Runner Pro",
    href: "#",
    price: "$89.99",
    color: "Navy Blue",
    size: "US 10",
    imageSrc: "https://ui.shadcn.com/placeholder.svg",
    imageAlt:
      "Lightweight running shoes with premium cushioning and breathable mesh upper.",
  },
  {
    id: 2,
    title: "Classic Timepiece",
    href: "#",
    price: "$149.99",
    color: "Silver",
    size: "42mm",
    imageSrc: "https://ui.shadcn.com/placeholder.svg",
    imageAlt:
      "Elegant minimalist watch with stainless steel case and genuine leather strap.",
  },
  {
    id: 3,
    title: "Travel Explorer Pack",
    href: "#",
    price: "$64.99",
    color: "Charcoal Gray",
    size: "One Size",
    imageSrc: "https://ui.shadcn.com/placeholder.svg",
    imageAlt:
      "Durable travel backpack with multiple compartments and water-resistant material.",
  },
  {
    id: 4,
    title: "Premium Camera",
    href: "#",
    price: "$299.99",
    color: "Black",
    size: "Standard",
    imageSrc: "https://ui.shadcn.com/placeholder.svg",
    imageAlt:
      "Professional-grade camera with advanced autofocus and 4K video recording capabilities.",
  },
  {
    id: 5,
    title: "Wireless Headphones",
    href: "#",
    price: "$79.99",
    color: "Matte Black",
    size: "One Size",
    imageSrc: "https://ui.shadcn.com/placeholder.svg",
    imageAlt:
      "High-quality wireless headphones with active noise cancellation and 30-hour battery life.",
  },
];

const deliveryMethods = [
  {
    id: "standard",
    title: "Standard",
    turnaround: "4–10 business days",
    price: "$8.00",
  },
  {
    id: "express",
    title: "Express",
    turnaround: "2–5 business days",
    price: "$24.00",
  },
];

const paymentMethods = [
  { id: "credit-card", title: "Credit card" },
  { id: "paypal", title: "PayPal" },
  { id: "crypto", title: "Cryptocurrency" },
];

export default function Checkout1() {
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [promoCode, setPromoCode] = useState("");

  return (
    <div className="bg-muted/60 relative py-0 md:py-16">
      <div className="mx-auto max-w-2xl px-0 md:px-6 lg:max-w-5xl">
        <h1 className="sr-only">Checkout</h1>

        <form className="relative gap-12 lg:grid lg:grid-cols-2">
          <div className="bg-card md:border-border p-4 py-6 sm:mb-0 sm:rounded-lg sm:border sm:p-6 sm:shadow-xs">
            <FieldGroup>
              {/* Contact information */}
              <FieldSet>
                <FieldLegend>Contact information</FieldLegend>
                <FieldDescription>
                  We'll use this email to send you order confirmations and
                  updates
                </FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email-address">
                      Email address
                    </FieldLabel>
                    <Input
                      id="email-address"
                      name="email-address"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>

              <FieldSeparator />

              {/* Shipping information */}
              <FieldSet>
                <FieldLegend>Shipping information</FieldLegend>
                <FieldDescription>
                  Enter the address where you want your order delivered
                </FieldDescription>
                <FieldGroup className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                  <Field>
                    <FieldLabel htmlFor="first-name">First name</FieldLabel>
                    <Input
                      id="first-name"
                      name="first-name"
                      type="text"
                      autoComplete="given-name"
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="last-name">Last name</FieldLabel>
                    <Input
                      id="last-name"
                      name="last-name"
                      type="text"
                      autoComplete="family-name"
                      required
                    />
                  </Field>

                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="company">Company</FieldLabel>
                    <Input id="company" name="company" type="text" />
                  </Field>

                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="address">Address</FieldLabel>
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      autoComplete="street-address"
                      required
                    />
                  </Field>

                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="apartment">
                      Apartment, suite, etc.
                    </FieldLabel>
                    <Input id="apartment" name="apartment" type="text" />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="city">City</FieldLabel>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      autoComplete="address-level2"
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="country">Country</FieldLabel>
                    <Select defaultValue="us" required>
                      <SelectTrigger id="country">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="ca">Canada</SelectItem>
                        <SelectItem value="mx">Mexico</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="region">State / Province</FieldLabel>
                    <Input
                      id="region"
                      name="region"
                      type="text"
                      autoComplete="address-level1"
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="postal-code">Postal code</FieldLabel>
                    <Input
                      id="postal-code"
                      name="postal-code"
                      type="text"
                      autoComplete="postal-code"
                      required
                    />
                  </Field>

                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="phone">Phone</FieldLabel>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>

              <FieldSeparator />

              {/* Billing address */}
              <FieldSet>
                <FieldLegend>Billing address</FieldLegend>
                <FieldDescription>
                  The billing address associated with your payment method
                </FieldDescription>
                <FieldGroup>
                  <Field orientation="horizontal">
                    <Checkbox
                      id="same-as-shipping"
                      checked={sameAsShipping}
                      onCheckedChange={(checked) =>
                        setSameAsShipping(checked as boolean)
                      }
                    />
                    <FieldLabel
                      htmlFor="same-as-shipping"
                      className="font-normal"
                    >
                      Same as shipping address
                    </FieldLabel>
                  </Field>
                </FieldGroup>

                {!sameAsShipping && (
                  <FieldGroup className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                    <Field className="sm:col-span-2">
                      <FieldLabel htmlFor="billing-address">Address</FieldLabel>
                      <Input
                        id="billing-address"
                        name="billing-address"
                        type="text"
                        autoComplete="billing street-address"
                        required={!sameAsShipping}
                      />
                    </Field>

                    <Field className="sm:col-span-2">
                      <FieldLabel htmlFor="billing-apartment">
                        Apartment, suite, etc.
                      </FieldLabel>
                      <Input
                        id="billing-apartment"
                        name="billing-apartment"
                        type="text"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="billing-city">City</FieldLabel>
                      <Input
                        id="billing-city"
                        name="billing-city"
                        type="text"
                        autoComplete="billing address-level2"
                        required={!sameAsShipping}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="billing-country">Country</FieldLabel>
                      <Select defaultValue="us" required={!sameAsShipping}>
                        <SelectTrigger id="billing-country">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="us">United States</SelectItem>
                          <SelectItem value="ca">Canada</SelectItem>
                          <SelectItem value="mx">Mexico</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="billing-region">
                        State / Province
                      </FieldLabel>
                      <Input
                        id="billing-region"
                        name="billing-region"
                        type="text"
                        autoComplete="billing address-level1"
                        required={!sameAsShipping}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="billing-postal-code">
                        Postal code
                      </FieldLabel>
                      <Input
                        id="billing-postal-code"
                        name="billing-postal-code"
                        type="text"
                        autoComplete="billing postal-code"
                        required={!sameAsShipping}
                      />
                    </Field>
                  </FieldGroup>
                )}
              </FieldSet>

              <FieldSeparator />

              {/* Delivery method */}
              <FieldSet>
                <FieldLegend>Delivery method</FieldLegend>
                <FieldDescription>
                  Choose how you want to receive your order
                </FieldDescription>
                <RadioGroup defaultValue={deliveryMethods[0]?.id}>
                  {deliveryMethods.map((deliveryMethod) => (
                    <FieldLabel
                      key={deliveryMethod.id}
                      htmlFor={deliveryMethod.id}
                    >
                      <Field orientation="horizontal">
                        <FieldContent>
                          <FieldTitle>{deliveryMethod.title}</FieldTitle>
                          <FieldDescription>
                            {deliveryMethod.turnaround} ·{" "}
                            <span className="text-foreground font-medium">
                              {deliveryMethod.price}
                            </span>
                          </FieldDescription>
                        </FieldContent>
                        <RadioGroupItem
                          value={deliveryMethod.id}
                          id={deliveryMethod.id}
                        />
                      </Field>
                    </FieldLabel>
                  ))}
                </RadioGroup>
              </FieldSet>

              <FieldSeparator />

              {/* Payment */}
              <FieldSet>
                <FieldLegend>Payment</FieldLegend>
                <FieldDescription>
                  All transactions are secure and encrypted
                </FieldDescription>
                <FieldGroup>
                  <FieldLabel className="sr-only">Payment method</FieldLabel>
                  <RadioGroup defaultValue={paymentMethods[0]?.id}>
                    {paymentMethods.map((paymentMethod) => (
                      <FieldLabel
                        key={paymentMethod.id}
                        htmlFor={paymentMethod.id}
                      >
                        <Field orientation="horizontal">
                          <FieldContent>
                            <FieldTitle>{paymentMethod.title}</FieldTitle>
                          </FieldContent>
                          <RadioGroupItem
                            value={paymentMethod.id}
                            id={paymentMethod.id}
                          />
                        </Field>
                      </FieldLabel>
                    ))}
                  </RadioGroup>
                </FieldGroup>

                <FieldGroup className="grid grid-cols-4 gap-x-4 gap-y-6">
                  <Field className="col-span-4">
                    <FieldLabel htmlFor="card-number">Card number</FieldLabel>
                    <Input
                      id="card-number"
                      name="card-number"
                      type="text"
                      autoComplete="cc-number"
                      placeholder="1234 5678 9012 3456"
                      required
                    />
                    <FieldDescription>
                      Enter your 16-digit card number
                    </FieldDescription>
                  </Field>

                  <Field className="col-span-4">
                    <FieldLabel htmlFor="name-on-card">Name on card</FieldLabel>
                    <Input
                      id="name-on-card"
                      name="name-on-card"
                      type="text"
                      autoComplete="cc-name"
                      required
                    />
                  </Field>

                  <Field className="col-span-3">
                    <FieldLabel htmlFor="expiration-date">
                      Expiration date (MM/YY)
                    </FieldLabel>
                    <Input
                      id="expiration-date"
                      name="expiration-date"
                      type="text"
                      autoComplete="cc-exp"
                      placeholder="MM/YY"
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="cvc">CVC</FieldLabel>
                    <Input
                      id="cvc"
                      name="cvc"
                      type="text"
                      autoComplete="csc"
                      placeholder="123"
                      required
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </FieldGroup>
            <Button
              type="submit"
              size="lg"
              className="mt-6 hidden w-full md:block"
            >
              Confirm order
            </Button>
          </div>

          {/* Order summary */}
          <div className="px-4 py-6 sm:sticky sm:top-6 lg:max-h-[90vh] lg:p-0">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em]">Order summary</h2>
            <div className="lg:flex lg:max-h-[calc(90vh-3rem)] lg:flex-col">
              <h3 className="sr-only">Items in your cart</h3>
              <ul className="divide-y lg:flex-1 lg:overflow-y-auto">
                {products.map((product) => (
                  <li key={product.id} className="flex py-4 sm:py-6">
                    <div className="shrink-0">
                      <div className="relative size-20 overflow-hidden">
                        <Image
                          alt={product.imageAlt}
                          src={product.imageSrc}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>

                    <div className="ml-6 flex flex-1 flex-col">
                      <div className="flex">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm">
                            <Link
                              href={product.href}
                              className="font-medium hover:underline"
                            >
                              {product.title}
                            </Link>
                          </h4>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {product.color}
                          </p>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {product.size}
                          </p>
                        </div>

                        <div className="ml-4 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <span className="sr-only">Remove</span>
                            <Trash2 />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-1 items-end justify-between pt-2">
                        <p className="text-sm font-medium">{product.price}</p>

                        <div className="ml-4">
                          <Select defaultValue="1">
                            <SelectTrigger
                              className="bg-background w-16"
                              aria-label="Quantity"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="6">6</SelectItem>
                              <SelectItem value="7">7</SelectItem>
                              <SelectItem value="8">8</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="lg:shrink-0">
                <div className="border-t pt-4">
                  <InputGroup className="bg-background w-full">
                    <InputGroupInput
                      id="promo-code"
                      type="text"
                      placeholder="Enter code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton variant="ghost">Apply</InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </div>
                <dl className="space-y-4 py-4 text-sm sm:py-6">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="font-medium">$683.95</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Shipping</dt>
                    <dd className="font-medium">$8.00</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Taxes</dt>
                    <dd className="font-medium">$55.00</dd>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-base">
                    <dt className="font-semibold">Total</dt>
                    <dd className="font-semibold">$746.95</dd>
                  </div>
                </dl>
                <Button
                  type="submit"
                  size="lg"
                  className="mt-6 block w-full md:hidden"
                >
                  Confirm order
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
