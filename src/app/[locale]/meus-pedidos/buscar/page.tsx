import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { OrderLookupForm } from "./order-lookup-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orderLookup");
  return { title: t("title") };
}

export default function OrderLookupPage() {
  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-md px-4 md:px-6">
        <OrderLookupForm />
      </div>
    </section>
  );
}
