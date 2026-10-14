import { use } from "react";
import { getTranslations } from "next-intl/server";
import { ReviewSubmissionForm } from "./review-submission-form";

interface PageProps {
  params: Promise<{ locale: string; orderId: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default function ReviewPage({ params, searchParams }: PageProps) {
  const { locale, orderId } = use(params);
  const { token } = use(searchParams);

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-2xl px-4">
        <ReviewSubmissionForm
          orderId={orderId}
          token={token ?? ""}
          locale={locale}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}
