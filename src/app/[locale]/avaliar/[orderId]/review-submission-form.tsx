"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Star, Loader2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReviewProduct {
  productId: string;
  slug: string;
  name: string;
}

interface ExistingReview {
  product_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  approved: boolean;
}

interface OrderData {
  order: { id: string; customerName: string | null };
  products: ReviewProduct[];
  existingReviews: ExistingReview[];
}

export function ReviewSubmissionForm({
  orderId,
  token,
  locale,
}: {
  orderId: string;
  token: string;
  locale: string;
}) {
  const t = useTranslations("reviews");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OrderData | null>(null);

  useEffect(() => {
    if (!token) {
      setError(t("invalidToken"));
      setLoading(false);
      return;
    }
    fetch(`/api/review/order/${orderId}?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? t("invalidToken"));
        }
        return res.json();
      })
      .then((body: OrderData) => setData(body))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId, token, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/50" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border-t-[2px] border-t-destructive bg-card p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.15em]">
              {error ?? t("invalidToken")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const reviewedMap = new Map(
    data.existingReviews.map((r) => [r.product_id, r])
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="border-t-[2px] border-t-foreground bg-card p-6">
        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.1em]">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/70">
          {t("pageSubtitle")}
        </p>
        {data.order.customerName && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/60">
            {data.order.customerName} · #{data.order.id.slice(0, 8)}
          </p>
        )}
      </header>

      {data.products.map((product) => (
        <ProductReviewCard
          key={product.productId}
          product={product}
          orderId={orderId}
          token={token}
          locale={locale}
          existing={reviewedMap.get(product.productId)}
        />
      ))}
    </div>
  );
}

function ProductReviewCard({
  product,
  orderId,
  token,
  locale,
  existing,
}: {
  product: ReviewProduct;
  orderId: string;
  token: string;
  locale: string;
  existing: ExistingReview | undefined;
}) {
  const t = useTranslations("reviews");
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(Boolean(existing));

  async function submit() {
    if (rating < 1 || rating > 5) {
      toast.error(t("errorRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/review/order/${orderId}?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.productId,
            rating,
            title: title || undefined,
            body: body || undefined,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("errorSubmit"));
      }
      setSubmitted(true);
      toast.success(t("submitted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorSubmit"));
    } finally {
      setSubmitting(false);
    }
  }

  const prefix = locale === "pt" ? "" : `/${locale}`;

  return (
    <article className="border-t-[2px] border-t-foreground bg-card">
      <header className="border-b border-foreground/15 px-6 py-4">
        <a
          href={`${prefix}/produto/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display text-sm font-bold uppercase tracking-[0.15em] hover:underline"
        >
          {product.name}
        </a>
      </header>

      {submitted ? (
        <div className="flex flex-col gap-2 p-6">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-foreground" />
            <p className="font-display text-sm font-bold uppercase tracking-[0.15em]">
              {t("submitted")}
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/70">
            {existing?.approved ? t("approved") : t("submittedDescription")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 p-6">
          {/* Rating */}
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70">
              {t("ratingLabel")}
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      "h-7 w-7 transition-colors",
                      (hover || rating) >= n
                        ? "fill-foreground text-foreground"
                        : "text-foreground/25"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor={`title-${product.productId}`}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70"
            >
              {t("titleLabel")}
            </label>
            <Input
              id={`title-${product.productId}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              maxLength={100}
              className="rounded-none"
            />
          </div>

          {/* Body */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor={`body-${product.productId}`}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/70"
            >
              {t("bodyLabel")}
            </label>
            <Textarea
              id={`body-${product.productId}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("bodyPlaceholder")}
              maxLength={2000}
              rows={4}
              className="rounded-none"
            />
          </div>

          <Button
            onClick={submit}
            disabled={submitting || rating < 1}
            className="rounded-none font-mono text-[11px] font-bold uppercase tracking-[0.15em]"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {t("submit")}
          </Button>
        </div>
      )}
    </article>
  );
}
