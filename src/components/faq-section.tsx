"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { RuledDivider } from "@/components/product/ruled-divider";
import { FaqJsonLd } from "@/components/structured-data";

const QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

export function FaqSection() {
  const t = useTranslations("faq");
  const [open, setOpen] = useState<number | null>(0);

  const items = QUESTION_KEYS.map((key, index) => ({
    question: t(key),
    answer: t(`a${index + 1}`),
  }));

  return (
    <section className="py-16 md:py-24">
      <FaqJsonLd items={items} />
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold uppercase tracking-[0.1em] md:text-4xl">
            {t("title")}
          </h2>
          <RuledDivider variant="ornamental" className="mx-auto mt-4 max-w-xs" />
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-foreground/60">
            {t("subtitle")}
          </p>
        </div>

        <ul className="space-y-3">
          {items.map((item, index) => {
            const isOpen = open === index;
            return (
              <li
                key={index}
                className="border-t-[2px] border-t-foreground border-x border-b border-foreground/20 bg-card"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-sm font-bold uppercase tracking-[0.05em] transition-colors hover:bg-foreground/[0.03] md:text-base"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-300",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-foreground/10 px-5 py-4 font-mono text-xs leading-relaxed text-foreground/80 md:text-sm">
                    {item.answer}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
