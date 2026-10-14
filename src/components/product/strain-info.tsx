"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrainInfoProps {
  seedBank?: {
    name: string;
    website?: string;
  } | null;
  seedType: string | null;
  seedTypeLabel: string;
  floweringMin: number | null;
  floweringMax: number | null;
  thcMax: number | null;
  cbdMax: number | null;
  labels: {
    seedBank: string;
    seedType: string;
    floweringTime: string;
    weeks: string;
  };
}

interface StatCellProps {
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
}

function StatCell({ label, children, isLast = false }: StatCellProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5 px-4 py-3.5 text-center transition-opacity duration-200 group-hover:opacity-40 hover:!opacity-100",
        !isLast ? "border-b border-foreground/10 md:border-b-0 md:border-r md:border-foreground/10" : ""
      )}
    >
      <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/40">
        {label}
      </span>
      <span className="min-w-0 break-words text-sm font-mono font-bold uppercase leading-tight tracking-tight text-foreground/80">
        {children}
      </span>
    </div>
  );
}

function MobileStatBlock({
  label,
  children,
  colSpan2,
  showRightBorder,
}: {
  label: string;
  children: React.ReactNode;
  colSpan2: boolean;
  showRightBorder: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5 border-b border-foreground/10 px-3 py-3.5 transition-opacity duration-200 group-hover:opacity-40 hover:!opacity-100",
        colSpan2 && "col-span-2 items-center",
        showRightBorder && "border-r border-foreground/10"
      )}
    >
      <span
        className={cn(
          "text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/40",
          colSpan2 && "text-center"
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          "min-w-0 w-full break-words text-center text-sm font-mono font-bold uppercase leading-tight tracking-tight text-foreground/80"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function StrainInfo({
  seedBank,
  seedType,
  seedTypeLabel,
  floweringMin,
  floweringMax,
  thcMax,
  cbdMax,
  labels,
}: StrainInfoProps) {
  type CellData = { key: string; label: string; content: React.ReactNode };
  const items: CellData[] = [];

  if (seedBank) {
    items.push({
      key: "bank",
      label: labels.seedBank,
      content: seedBank.website ? (
        <a
          href={seedBank.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full flex-wrap items-baseline justify-center gap-x-1 gap-y-0.5 break-words hover:text-primary"
        >
          <span className="min-w-0 break-words">{seedBank.name}</span>
          <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
        </a>
      ) : (
        seedBank.name
      ),
    });
  }

  if (seedType) {
    items.push({
      key: "type",
      label: labels.seedType,
      content: seedTypeLabel,
    });
  }

  if (floweringMin) {
    items.push({
      key: "flower",
      label: labels.floweringTime,
      content: (
        <>
          {floweringMin}
          {floweringMax && floweringMax !== floweringMin ? `–${floweringMax}` : ""}{" "}
          {labels.weeks}
        </>
      ),
    });
  }

  if (thcMax !== null) {
    items.push({
      key: "thc",
      label: "THC",
      content: `${thcMax}%`,
    });
  }

  if (cbdMax !== null) {
    items.push({
      key: "cbd",
      label: "CBD",
      content: `${cbdMax}%`,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="group relative">
      {/* Mobile: 2-col grid; seed bank full width */}
      <div className="grid grid-cols-2 md:hidden">
        {items.map((item, i) => {
          const isBank = item.key === "bank";
          const restIdx = items.slice(0, i).filter((x) => x.key !== "bank").length;
          const showRightBorder = !isBank && restIdx % 2 === 0;
          return (
            <MobileStatBlock
              key={item.key}
              label={item.label}
              colSpan2={isBank}
              showRightBorder={showRightBorder}
            >
              {item.content}
            </MobileStatBlock>
          );
        })}
      </div>

      {/* Desktop: compartmentalized grid with vertical ruled lines */}
      <div
        className="hidden md:grid items-stretch"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map((item, i) => (
          <StatCell key={item.key} label={item.label} isLast={i === items.length - 1}>
            {item.content}
          </StatCell>
        ))}
      </div>
    </div>
  );
}
