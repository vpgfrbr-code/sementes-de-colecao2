import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { CheckoutForm } from "./checkout-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("title") };
}

export default function CheckoutPage() {
  return (
    <section>
      <CheckoutForm />
    </section>
  );
}
