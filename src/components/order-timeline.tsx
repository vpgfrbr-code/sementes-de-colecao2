"use client";

import { CheckIcon, HomeIcon, PackageIcon, TruckIcon } from "lucide-react";
import { formatOrderDateForCustomer } from "@/lib/format-date";

type TFn = (key: string) => string;

interface OrderTimelineProps {
  status: string;
  /** Translator scoped to "order" namespace */
  t: TFn;
  createdAt: string;
  customerTzOffset?: number | null;
  locale: string;
}

const STEPS = [
  { id: "placed", icon: CheckIcon, labelKey: "timeline_placed" },
  { id: "processing", icon: PackageIcon, labelKey: "timeline_processing" },
  { id: "shipped", icon: TruckIcon, labelKey: "timeline_shipped" },
  { id: "delivered", icon: HomeIcon, labelKey: "timeline_delivered" },
] as const;

function reachedIndex(status: string): number {
  switch (status) {
    case "delivered":
      return 3;
    case "shipped":
      return 2;
    case "approved":
    case "confirmed":
      return 1;
    case "waiting_payment":
    case "payment_reported":
      return 0;
    default:
      return -1;
  }
}

export function OrderTimeline({
  status,
  t,
  createdAt,
  customerTzOffset = null,
  locale,
}: OrderTimelineProps) {
  const reached = reachedIndex(status);
  const placedDate = formatOrderDateForCustomer(
    createdAt,
    customerTzOffset,
    locale,
    { withTime: false, withOffsetSuffix: false },
  );

  return (
    <>
      {/* Mobile: vertical */}
      <ol className="flex flex-col gap-4 md:hidden">
        {STEPS.map((step, index) => {
          const completed = index <= reached;
          const Icon = step.icon;
          const next = STEPS[index + 1];
          return (
            <li key={step.id} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={
                    "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors " +
                    (completed
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  <Icon className="size-5" />
                </div>
                {next && (
                  <div
                    className={
                      "mt-2 h-8 w-0.5 " +
                      (index + 1 <= reached ? "bg-primary" : "bg-border")
                    }
                  />
                )}
              </div>
              <div className="flex flex-col pt-2">
                <span
                  className={
                    "text-sm font-medium " +
                    (completed ? "text-foreground" : "text-muted-foreground")
                  }
                >
                  {t(step.labelKey)}
                </span>
                {step.id === "placed" && (
                  <span className="text-muted-foreground text-xs">
                    {placedDate}
                  </span>
                )}
                {!completed && step.id === "processing" && (
                  <span className="text-muted-foreground text-xs">
                    {t("timeline_processing_hint")}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Desktop: horizontal */}
      <div className="hidden md:block">
        <div className="relative flex items-start justify-between">
          {STEPS.map((step, index) => {
            const completed = index <= reached;
            const Icon = step.icon;
            const align =
              index === 0
                ? "items-start"
                : index === STEPS.length - 1
                  ? "items-end"
                  : "items-center";
            return (
              <div
                key={step.id}
                className={`relative z-10 flex flex-col gap-2 ${align}`}
              >
                <div
                  className={
                    "flex size-10 items-center justify-center rounded-full transition-colors " +
                    (completed
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  <Icon className="size-5" />
                </div>
                <div className={`flex flex-col ${align}`}>
                  <span
                    className={
                      "text-xs font-medium " +
                      (completed ? "text-foreground" : "text-muted-foreground")
                    }
                  >
                    {t(step.labelKey)}
                  </span>
                  {step.id === "placed" && (
                    <span className="text-muted-foreground text-xs">
                      {placedDate}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {/* Connector */}
          <div className="absolute top-5 right-5 left-5 h-0.5 -translate-y-1/2">
            <div className="bg-border h-full w-full" />
            <div
              className="bg-primary absolute top-0 left-0 h-full transition-[width] duration-500"
              style={{
                width: `${
                  reached < 0
                    ? 0
                    : (Math.min(reached, STEPS.length - 1) /
                        (STEPS.length - 1)) *
                      100
                }%`,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
