import { Check, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

export interface PublicReview {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
}

export interface ReviewAggregate {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function computeAggregate(
  reviews: Pick<PublicReview, "rating">[]
): ReviewAggregate {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
    1 | 2 | 3 | 4 | 5,
    number
  >;
  if (reviews.length === 0) {
    return { average: 0, count: 0, distribution };
  }
  let sum = 0;
  for (const r of reviews) {
    sum += r.rating;
    const k = r.rating as 1 | 2 | 3 | 4 | 5;
    if (distribution[k] !== undefined) distribution[k]++;
  }
  return {
    average: sum / reviews.length,
    count: reviews.length,
    distribution,
  };
}

function StarRow({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const px = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            px,
            value >= n
              ? "fill-foreground text-foreground"
              : value >= n - 0.5
                ? "fill-foreground/50 text-foreground"
                : "text-foreground/20"
          )}
        />
      ))}
    </div>
  );
}

export async function ProductReviewsSection({
  reviews,
  aggregate,
  locale,
}: {
  reviews: PublicReview[];
  aggregate: ReviewAggregate;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "reviews" });

  if (aggregate.count === 0) {
    return (
      <section
        id="reviews"
        className="border-t-[2px] border-t-foreground bg-card p-6 md:p-8"
      >
        <header className="mb-4">
          <h2 className="font-display text-xl font-bold uppercase tracking-[0.1em]">
            {t("customerReviews")}
          </h2>
        </header>
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/70">
          {t("noReviewsYet")} — {t("beTheFirst")}
        </p>
      </section>
    );
  }

  return (
    <section
      id="reviews"
      className="border-t-[2px] border-t-foreground bg-card p-6 md:p-8"
    >
      <header className="mb-6 flex flex-col gap-2">
        <h2 className="font-display text-xl font-bold uppercase tracking-[0.1em]">
          {t("customerReviews")}
        </h2>
        <div className="flex items-center gap-3">
          <StarRow value={aggregate.average} size="lg" />
          <span className="font-mono text-sm font-bold">
            {aggregate.average.toFixed(1)} / 5
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/70">
            {aggregate.count === 1
              ? t("basedOnOne")
              : t("basedOn", { count: aggregate.count })}
          </span>
        </div>
      </header>

      {/* Distribution bars */}
      <div className="mb-8 flex flex-col gap-1.5">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = aggregate.distribution[star];
          const pct = aggregate.count > 0 ? (count / aggregate.count) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-3">
              <span className="w-6 font-mono text-[10px] tabular-nums text-foreground/70">
                {star}★
              </span>
              <div className="relative h-1.5 flex-1 bg-muted">
                <div
                  className="absolute inset-y-0 left-0 bg-foreground"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono text-[10px] tabular-nums text-foreground/70">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Individual reviews */}
      <ul className="flex flex-col divide-y divide-foreground/10">
        {reviews.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 py-5 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <StarRow value={r.rating} size="sm" />
                <span className="font-display text-[13px] font-bold uppercase tracking-[0.1em]">
                  {r.author_name}
                </span>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/60">
                {new Date(r.created_at).toLocaleDateString(locale)}
              </span>
            </div>
            {r.title && <p className="font-bold">{r.title}</p>}
            {r.body && (
              <p className="whitespace-pre-wrap text-sm text-foreground/85">
                {r.body}
              </p>
            )}
            <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/60">
              <Check className="h-3 w-3" />
              {t("verifiedBuyer")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
