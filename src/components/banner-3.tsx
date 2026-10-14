"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Banner3() {
  return (
    <aside
      role="alert"
      aria-label="Cookie consent banner"
      className="bg-background py-4"
    >
      <div className="container-padding-x mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <p
          className="text-foreground max-w-xl text-center text-sm md:text-left"
          id="cookie-consent-description"
        >
          We use cookies to enhance your experience. By clicking "Accept," you
          consent to the use of all cookies. Learn more in our{" "}
          <Link href="#" className="underline" aria-label="View cookie policy">
            cookie policy
          </Link>
          .
        </p>
        <div
          className="flex w-full flex-col gap-2 md:w-auto md:flex-row"
          aria-describedby="cookie-consent-description"
        >
          <Button
            onClick={() => {
              /* Add accept handler */
            }}
            className="order-1 w-full md:order-2 md:w-auto"
            aria-label="Accept all cookies"
          >
            Accept all
          </Button>
          <Button
            onClick={() => {
              /* Add reject handler */
            }}
            className="order-2 w-full md:order-1 md:w-auto"
            variant="outline"
            aria-label="Reject all cookies"
          >
            Reject all
          </Button>
        </div>
      </div>
    </aside>
  );
}
