"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Check } from "lucide-react";
import { TextAnimate } from "@/components/ui/text-animate";
import { NumberTicker } from "@/components/ui/number-ticker";
import { claimAffiliateCoupon } from "@/lib/affiliate-cookie";

interface SaleSection5Props {
  title?: string;
  subtitle?: string;
  couponCode?: string;
  endDate?: Date;
  labels?: {
    days?: string;
    hours?: string;
    minutes?: string;
    seconds?: string;
  };
  unlockLabel?: string;
  copiedLabel?: string;
  couponLabel?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function SaleSection5({
  title = "Flash Sale! 33% off!",
  subtitle = "Hurry up! The offer ends soon.",
  couponCode,
  endDate,
  labels,
  unlockLabel,
  copiedLabel,
  couponLabel,
}: SaleSection5Props) {
  const compactTitle = useMemo(() => {
    const normalized = title.trim();
    if (!normalized) return "FLASH SALE";
    if (/420/i.test(normalized) && /flash sale/i.test(normalized)) return "FLASH SALE 420";
    return normalized.length > 34 ? `${normalized.slice(0, 31).trimEnd()}...` : normalized;
  }, [title]);

  const defaultEndDate = useMemo(
    () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    [],
  );
  const targetDate = endDate ?? defaultEndDate;
  const endTimestamp = useMemo(() => targetDate.getTime(), [targetDate]);

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const difference = endTimestamp - now;
      if (difference > 0) {
        setTimeRemaining({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [endTimestamp]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(timer);
  }, []);

  function handleCopyCoupon() {
    if (!couponCode) return;
    void navigator.clipboard.writeText(couponCode).catch(() => {});
    // Persist to cookie for auto-apply at checkout. Duration reflects the
    // coupon's own persistence window (configured per coupon in admin).
    void claimAffiliateCoupon(couponCode);
    setUnlocked(true);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const timeUnits = [
    { value: timeRemaining.days, label: labels?.days ?? "Days" },
    { value: timeRemaining.hours, label: labels?.hours ?? "Hours" },
    { value: timeRemaining.minutes, label: labels?.minutes ?? "Minutes" },
    { value: timeRemaining.seconds, label: labels?.seconds ?? "Seconds" },
  ];

  return (
    <section className="border-t-[3px] border-primary-foreground/20 bg-bark text-primary-foreground">
      <div className="mx-auto max-w-7xl px-3 py-1.5 md:px-6 md:py-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">

          {/* Title + subtitle — full-width centered on mobile, truncated left on desktop */}
          <div className="min-w-0 sm:flex-1 sm:pr-1">
            <TextAnimate
              as="h2"
              animation="blurInUp"
              by="word"
              once
              className="text-center font-display text-sm font-bold uppercase tracking-[0.08em] text-primary-foreground sm:truncate sm:whitespace-nowrap sm:text-left sm:text-base"
            >
              {compactTitle}
            </TextAnimate>
            {subtitle && (
              <p className="mt-0.5 hidden truncate font-mono text-[9px] uppercase tracking-[0.06em] text-primary-foreground/55 md:block">
                {subtitle}
              </p>
            )}
          </div>

          {/* Countdown + CTA row */}
          <div className="flex items-center justify-center gap-1.5 sm:justify-end sm:gap-3">

            {/* Countdown */}
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              {timeUnits.map((unit, idx) => (
                <div key={unit.label} className="flex items-center gap-0.5 sm:gap-1">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 min-w-7 items-center justify-center rounded-none border border-primary-foreground/20 bg-primary-foreground/[0.07] px-0.5 font-display text-base font-extrabold leading-none sm:h-10 sm:min-w-9 sm:px-1 sm:text-xl">
                      {mounted ? (
                        <NumberTicker value={unit.value} className="tabular-nums text-primary-foreground" />
                      ) : (
                        <span>{String(unit.value).padStart(2, "0")}</span>
                      )}
                    </div>
                    <span className="mt-0.5 font-mono text-[6px] uppercase tracking-[0.06em] text-primary-foreground/50 sm:text-[8px]">
                      {unit.label}
                    </span>
                  </div>
                  {idx < timeUnits.length - 1 && (
                    <span className="pb-3 font-display text-sm font-bold text-primary-foreground/30 sm:text-lg">:</span>
                  )}
                </div>
              ))}
            </div>

            {/* Coupon CTA — visible label on mobile, blurred code on desktop */}
            {couponCode && (
              <div className="shrink-0 sm:pl-1">
                <button
                  onClick={handleCopyCoupon}
                  className={`group flex items-center gap-1 rounded-none border px-2 py-1.5 transition-all duration-300 sm:gap-1.5 sm:px-2.5 ${
                    unlocked
                      ? "border-accent/60 bg-accent/10"
                      : "border-primary-foreground/20 bg-primary-foreground/[0.07] hover:bg-primary-foreground/10"
                  }`}
                  title={unlocked ? couponCode : (unlockLabel ?? "Clique para desbloquear o cupom")}
                >
                  {/* Icon */}
                  <span className="flex h-3.5 w-3.5 items-center justify-center sm:h-4 sm:w-4">
                    {copied ? (
                      <Check className="h-3 w-3 text-accent" />
                    ) : (
                      <Lock
                        className={`h-3 w-3 transition-colors ${
                          unlocked ? "text-accent" : "text-primary-foreground/50 group-hover:text-primary-foreground/80"
                        }`}
                      />
                    )}
                  </span>

                  {/* Code — hidden on mobile when locked, visible on sm+ */}
                  <span
                    className={`font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-500 select-none sm:text-[11px] sm:tracking-[0.15em] ${
                      unlocked
                        ? "text-accent blur-0"
                        : "hidden text-primary-foreground/70 blur-sm sm:inline group-hover:blur-[2px]"
                    }`}
                  >
                    {couponCode}
                  </span>

                  {/* Label — always visible */}
                  <span className="font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-primary-foreground/60 sm:font-normal sm:text-primary-foreground/40">
                    {copied
                      ? (copiedLabel ?? "copiado")
                      : unlocked
                        ? (couponLabel ?? "cupom")
                        : (unlockLabel ?? "desbloquear")}
                  </span>
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </section>
  );
}
