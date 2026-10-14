"use client";

import { ShieldCheck, Package, Zap, Truck, type LucideIcon } from "lucide-react";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { CropMarks } from "@/components/product/crop-marks";
import { SealStamp } from "@/components/product/seal-stamp";
import { RuledDivider } from "@/components/product/ruled-divider";

const iconMap: Record<string, LucideIcon> = {
  ShieldCheck,
  Package,
  Zap,
  Truck,
};

interface IncentiveItem {
  title: string;
  description: string;
  icon: string;
}

interface IncentiveSectionProps {
  incentives: IncentiveItem[];
}

export default function Incentive5({ incentives }: IncentiveSectionProps) {
  return (
    <section className="relative bg-muted/40 py-6 md:py-10">
      {/* Crosshatch texture overlay */}
      <div className="crosshatch-bg absolute inset-0 text-foreground" />

      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        {/* Outer wrapper with crop marks */}
        <div className="relative p-4 md:p-5">
          <CropMarks />

          {/* Inner bordered compartment */}
          <div className="relative border-t-[2px] border-b-[2px] border-foreground border-x border-x-foreground/30 bg-card overflow-hidden">
            {/* Dot-grid texture */}
            <div className="dot-grid-bg absolute inset-0 text-foreground" />

            {/* Header bar */}
            <div className="relative border-b border-foreground/15 px-5 py-2.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/60 md:text-xs">
                  Certificado de Confianca
                </span>
                <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-foreground/30">
                  Sementes de Colecao
                </span>
              </div>
              <RuledDivider variant="ornamental" className="mt-2" />
            </div>

            {/* Trust items grid */}
            <StaggerGroup className="relative grid grid-cols-2 md:grid-cols-4">
              {incentives.map((item, i) => {
                const Icon = iconMap[item.icon];
                if (!Icon) return null;
                const num = String(i + 1).padStart(2, "0");
                const isLastCol = i === incentives.length - 1;
                const isTopRow = i < 2;

                return (
                  <StaggerItem key={item.title}>
                    <div
                      className={[
                        "relative flex flex-col items-center gap-3 px-4 py-5 text-center md:px-5 md:py-6",
                        // Mobile: right border on left-column cells (0, 2)
                        i % 2 === 0 ? "border-r border-foreground/10" : "",
                        // Mobile: bottom border on top-row cells (0, 1)
                        isTopRow ? "border-b border-foreground/10" : "",
                        // Desktop: override mobile borders; only right border except last col
                        "md:border-b-0",
                        !isLastCol ? "md:border-r md:border-foreground/10" : "md:border-r-0",
                      ].join(" ")}
                    >
                      {/* Seal stamp */}
                      <SealStamp
                        topText={item.title}
                        size={84}
                        textScale={1}
                        rotation={i % 2 === 0 ? -6 : 6}
                        centerContent={
                          <Icon
                            className="h-4 w-4 text-foreground/80"
                            aria-hidden="true"
                          />
                        }
                        className="mb-1"
                      />

                      {/* Text content */}
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="absolute left-3 top-3 font-mono text-[8px] uppercase tracking-[0.2em] text-foreground/25 md:left-4 md:top-4">
                          {num}
                        </span>
                        <h3 className="text-center font-display text-[10px] font-bold uppercase leading-tight tracking-[0.12em] md:text-xs md:tracking-[0.15em]">
                          {item.title}
                        </h3>
                        <p className="text-[11px] leading-relaxed text-foreground/50 md:text-sm">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerGroup>

            {/* Footer bar */}
            <div className="relative border-t border-foreground/15 px-5 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-mono font-semibold uppercase tracking-[0.25em] text-foreground/25">
                  Sementes de Colecao
                </span>
                <RuledDivider variant="thin" className="mx-4 flex-1" />
                <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-foreground/25">
                  Est. 2024
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
