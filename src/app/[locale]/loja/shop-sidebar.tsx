"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Search } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  ShopFilters,
  Availability,
  CycleType,
  SeedTypeFilter,
  CategoryItem,
  SeedBankItem,
} from "./shop-types";

interface ShopSidebarProps {
  filters: ShopFilters;
  onFiltersChange: (filters: ShopFilters) => void;
  categories: CategoryItem[];
  seedBanks: SeedBankItem[];
  allPackSizes: number[];
  priceRange: { min: number; max: number };
}

const CYCLE_TYPES: CycleType[] = ["automatic", "fast-flowering", "photoperiod"];
const SEED_TYPES: SeedTypeFilter[] = ["feminized", "regular"];
const AVAILABILITY_OPTIONS: Availability[] = ["available", "unavailable"];

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors min-h-[44px] ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-foreground/20 bg-card text-foreground/70 hover:border-foreground/50"
      }`}
    >
      {label}
    </button>
  );
}

export function ShopSidebar({
  filters,
  onFiltersChange,
  categories,
  seedBanks,
  allPackSizes,
  priceRange,
}: ShopSidebarProps) {
  const t = useTranslations("shop");

  function update(partial: Partial<ShopFilters>) {
    onFiltersChange({ ...filters, ...partial });
  }

  function toggleAvailability(val: Availability) {
    update({ availability: filters.availability === val ? null : val });
  }

  function toggleCycleType(val: CycleType) {
    update({ cycleType: filters.cycleType === val ? null : val });
  }

  function togglePackSize(size: number) {
    const next = filters.packSizes.includes(size)
      ? filters.packSizes.filter((s) => s !== size)
      : [...filters.packSizes, size];
    update({ packSizes: next });
  }

  function toggleSeedType(val: SeedTypeFilter) {
    update({ seedType: filters.seedType === val ? null : val });
  }

  function toggleCategory(id: string) {
    const next = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((c) => c !== id)
      : [...filters.categoryIds, id];
    update({ categoryIds: next });
  }

  const cycleTypeLabels: Record<CycleType, string> = {
    automatic: t("cycleAutomatic"),
    "fast-flowering": t("cycleFastFlowering"),
    photoperiod: t("cyclePhotoperiod"),
  };

  const seedTypeLabels: Record<SeedTypeFilter, string> = {
    feminized: "Feminizada",
    regular: "Regular",
  };

  const availabilityLabels: Record<Availability, string> = {
    available: t("available"),
    unavailable: t("unavailable"),
  };

  /* Pack size display — shows exact seed count */
  function formatPackSize(size: number): string {
    return String(size);
  }

  const [searchQuery, setSearchQuery] = useState("");
  const q = searchQuery.toLowerCase();

  /** Checks if a label matches the search query */
  function matches(label: string) {
    return !q || label.toLowerCase().includes(q);
  }

  return (
    <div className="space-y-0">
      {/* ─── Header ─── */}
      <div className="border-b-[2px] border-foreground pb-3 mb-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em]">
          {t("findYourSeed").toUpperCase()}
        </h2>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/40">
          {t("stillDoubt")}
        </p>
      </div>

      {/* ─── Search ─── */}
      <div className="relative mb-5">
        <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-foreground/30" />
        <Input
          placeholder={t("searchFilters")}
          className="h-9 rounded-none border-foreground/20 pl-9 font-mono text-[11px] uppercase tracking-[0.05em]"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ─── Price Range ─── */}
      {priceRange.max > priceRange.min && (
        <FilterSection title={t("priceRange")}>
          <PriceRangeSlider
            min={priceRange.min}
            max={priceRange.max}
            currentMin={filters.priceMin ?? priceRange.min}
            currentMax={filters.priceMax ?? priceRange.max}
            onChange={(min, max) =>
              update({
                priceMin: min <= priceRange.min ? null : min,
                priceMax: max >= priceRange.max ? null : max,
              })
            }
          />
        </FilterSection>
      )}

      {/* ─── Availability ─── */}
      <FilterSection title={t("availability")}>
        <div className="flex flex-wrap gap-2">
          {AVAILABILITY_OPTIONS.filter((opt) => matches(availabilityLabels[opt])).map((opt) => (
            <ToggleChip
              key={opt}
              label={availabilityLabels[opt]}
              active={filters.availability === opt}
              onClick={() => toggleAvailability(opt)}
            />
          ))}
        </div>
      </FilterSection>

      {/* ─── Cycle Type ─── */}
      <FilterSection title={t("cycleType")}>
        <div className="flex flex-wrap gap-2">
          {CYCLE_TYPES.filter((ct) => matches(cycleTypeLabels[ct])).map((ct) => (
            <ToggleChip
              key={ct}
              label={cycleTypeLabels[ct]}
              active={filters.cycleType === ct}
              onClick={() => toggleCycleType(ct)}
            />
          ))}
        </div>
      </FilterSection>

      {/* ─── Pack Size ─── */}
      {allPackSizes.length > 0 && (
        <FilterSection title={t("packWith")}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {allPackSizes
              .filter((size) => matches(formatPackSize(size)))
              .map((size) => (
                <ToggleChip
                  key={size}
                  label={formatPackSize(size)}
                  active={filters.packSizes.includes(size)}
                  onClick={() => togglePackSize(size)}
                />
              ))}
          </div>
        </FilterSection>
      )}

      {/* ─── Seed Type ─── */}
      <FilterSection title={t("seedType")}>
        <div className="flex flex-wrap gap-2">
          {SEED_TYPES.filter((st) => matches(seedTypeLabels[st])).map((st) => (
            <ToggleChip
              key={st}
              label={seedTypeLabels[st]}
              active={filters.seedType === st}
              onClick={() => toggleSeedType(st)}
            />
          ))}
        </div>
      </FilterSection>

      {/* ─── Characteristics (Categories) ─── */}
      {categories.length > 0 && (
        <FilterSection title={t("characteristics")}>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter((cat) =>
                matches(cat.category_translations[0]?.name ?? cat.slug)
              )
              .map((cat) => (
                <ToggleChip
                  key={cat.id}
                  label={cat.category_translations[0]?.name ?? cat.slug}
                  active={filters.categoryIds.includes(cat.id)}
                  onClick={() => toggleCategory(cat.id)}
                />
              ))}
          </div>
        </FilterSection>
      )}

      {/* ─── Seed Banks ─── */}
      {seedBanks.length > 0 && (
        <FilterSection title={t("brands")}>
          <div className="flex flex-wrap gap-2">
            {seedBanks
              .filter((sb) =>
                matches(sb.seed_bank_translations[0]?.name ?? sb.slug)
              )
              .map((sb) => (
                <ToggleChip
                  key={sb.id}
                  label={sb.seed_bank_translations[0]?.name ?? sb.slug}
                  active={filters.seedBankId === sb.id}
                  onClick={() =>
                    update({
                      seedBankId: filters.seedBankId === sb.id ? null : sb.id,
                    })
                  }
                />
              ))}
          </div>
        </FilterSection>
      )}
    </div>
  );
}

/* ── Collapsible section wrapper ── */
function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-foreground/10 py-1">
      <CollapsibleTrigger className="flex w-full items-center justify-between min-h-[44px] py-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-foreground/50">
          {title}
        </p>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-foreground/30 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/* ── Dual-thumb price range ── */
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function PriceRangeSlider({
  min,
  max,
  currentMin,
  currentMax,
  onChange,
}: {
  min: number;
  max: number;
  currentMin: number;
  currentMax: number;
  onChange: (min: number, max: number) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Current value labels */}
      <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.05em]">
        <span className="border border-foreground/20 px-2 py-0.5 text-foreground">
          {formatCents(currentMin)}
        </span>
        <span className="text-foreground/30">—</span>
        <span className="border border-foreground/20 px-2 py-0.5 text-foreground">
          {formatCents(currentMax)}
        </span>
      </div>

      {/* Track */}
      <div className="relative h-px bg-foreground/20">
        <div
          className="absolute h-full bg-foreground"
          style={{
            left: `${((currentMin - min) / (max - min)) * 100}%`,
            right: `${100 - ((currentMax - min) / (max - min)) * 100}%`,
          }}
        />
      </div>

      {/* Thumbs — stacked range inputs */}
      <div className="relative h-6">
        <input
          type="range"
          min={min}
          max={max}
          value={currentMin}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val <= currentMax) onChange(val, currentMax);
          }}
          className={[
            "pointer-events-none absolute w-full appearance-none bg-transparent",
            // Desktop thumb
            "[&::-webkit-slider-thumb]:pointer-events-auto",
            "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-foreground",
            "[&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:shadow-sm",
            // Firefox
            "[&::-moz-range-thumb]:pointer-events-auto",
            "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5",
            "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-foreground",
            "[&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:cursor-pointer",
            "[&::-moz-range-thumb]:rounded-none",
          ].join(" ")}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={currentMax}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val >= currentMin) onChange(currentMin, val);
          }}
          className={[
            "pointer-events-none absolute w-full appearance-none bg-transparent",
            "[&::-webkit-slider-thumb]:pointer-events-auto",
            "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-foreground",
            "[&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:shadow-sm",
            "[&::-moz-range-thumb]:pointer-events-auto",
            "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5",
            "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-foreground",
            "[&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:cursor-pointer",
            "[&::-moz-range-thumb]:rounded-none",
          ].join(" ")}
        />
      </div>

      {/* Min/max bounds */}
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-foreground/30">
        <span>{formatCents(min)}</span>
        <span>{formatCents(max)}</span>
      </div>
    </div>
  );
}
