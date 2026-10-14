"use client";

import * as React from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export interface AnchorSection {
  id: string;
  label: string;
}

/**
 * Navegação por âncoras para formulários longos: linha de chips sticky sob
 * o header do admin com scroll-spy simples. As seções alvo precisam de
 * `id` e `scroll-mt-32` (compensa header + esta barra).
 */
export function SectionAnchorNav({
  sections,
  className,
}: {
  sections: AnchorSection[];
  className?: string;
}) {
  const [active, setActive] = React.useState<string | null>(
    sections[0]?.id ?? null
  );
  // Trava o scroll-spy logo após um tap para o chip clicado não ser
  // "roubado" pelas seções intermediárias durante o smooth scroll.
  const lockUntil = React.useRef(0);

  React.useEffect(() => {
    const ids = sections.map((s) => s.id);
    function onScroll() {
      if (Date.now() < lockUntil.current) return;
      let current: string | null = ids[0] ?? null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 140) current = id;
      }
      setActive(current);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  if (sections.length < 2) return null;

  return (
    <div
      className={cn(
        "sticky top-14 z-20 -mx-4 border-b bg-background/95 px-4 backdrop-blur md:top-12 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8",
        className
      )}
    >
      <div className="flex snap-x items-center gap-1 overflow-x-auto overscroll-x-contain py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((s) => {
          const isActive = s.id === active;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                haptic("tick");
                lockUntil.current = Date.now() + 700;
                setActive(s.id);
                document
                  .getElementById(s.id)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={cn(
                "shrink-0 snap-start whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-medium transition-colors min-h-9",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
