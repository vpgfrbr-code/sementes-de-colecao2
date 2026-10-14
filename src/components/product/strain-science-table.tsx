"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

interface TerpeneEntry {
  is_dominant: boolean;
  terpenes: {
    id: string;
    slug: string;
    name: string;
    aroma: string;
    color: string;
  };
}

interface StrainScienceTableProps {
  productName: string;
  seedBank?: { name: string; website?: string } | null;
  seedType: string | null;
  seedTypeLabel: string;
  floweringMin: number | null;
  floweringMax: number | null;
  thcMin: number | null;
  thcMax: number | null;
  cbdMin: number | null;
  cbdMax: number | null;
  genetics: string | null;
  parentMother: string | null;
  parentFather: string | null;
  terpenes: TerpeneEntry[];
}

/**
 * Plain 2-column label/value table fallback for the rich
 * "Ciência do Fenótipo" card. Surfaced via the superadmin toggle in
 * /admin/configuracoes. Same data as the card, no illustrations.
 */
export function StrainScienceTable(props: StrainScienceTableProps) {
  const pt = useTranslations("product");

  const rows: Array<{ label: string; value: React.ReactNode }> = [];

  if (props.seedBank) {
    rows.push({
      label: pt("seedBank"),
      value: props.seedBank.website ? (
        <a
          href={props.seedBank.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-primary"
        >
          {props.seedBank.name}
          <ExternalLink className="h-3 w-3 opacity-50" />
        </a>
      ) : (
        props.seedBank.name
      ),
    });
  }

  if (props.seedType) {
    rows.push({ label: pt("seedType"), value: props.seedTypeLabel });
  }

  if (props.floweringMin) {
    const range =
      props.floweringMax && props.floweringMax !== props.floweringMin
        ? `${props.floweringMin}–${props.floweringMax}`
        : `${props.floweringMin}`;
    rows.push({
      label: pt("floweringTime"),
      value: `${range} ${pt("weeks")}`,
    });
  }

  if (props.thcMax !== null) {
    const range =
      props.thcMin !== null && props.thcMin !== props.thcMax
        ? `${props.thcMin}–${props.thcMax}%`
        : `${props.thcMax}%`;
    rows.push({ label: "THC", value: range });
  }

  if (props.cbdMax !== null) {
    const range =
      props.cbdMin !== null && props.cbdMin !== props.cbdMax
        ? `${props.cbdMin}–${props.cbdMax}%`
        : `${props.cbdMax}%`;
    rows.push({ label: "CBD", value: range });
  }

  if (props.genetics) {
    rows.push({ label: pt("genetics"), value: props.genetics });
  }

  if (props.parentMother) {
    rows.push({ label: pt("parentMother"), value: props.parentMother });
  }

  if (props.parentFather) {
    rows.push({ label: pt("parentFather"), value: props.parentFather });
  }

  if (props.terpenes.length > 0) {
    const sorted = [...props.terpenes].sort((a, b) => {
      if (a.is_dominant && !b.is_dominant) return -1;
      if (!a.is_dominant && b.is_dominant) return 1;
      return 0;
    });
    const dominant = sorted.find((t) => t.is_dominant);
    if (dominant) {
      const key = dominant.terpenes.slug;
      const name = pt.has(`terpenes.${key}.name`)
        ? pt(`terpenes.${key}.name` as never)
        : dominant.terpenes.name;
      rows.push({ label: pt("dominant"), value: name });
    }
    rows.push({
      label: pt("terpeneProfile"),
      value: (
        <ul className="m-0 list-none space-y-1 p-0">
          {sorted.map((entry) => {
            const key = entry.terpenes.slug;
            const name = pt.has(`terpenes.${key}.name`)
              ? pt(`terpenes.${key}.name` as never)
              : entry.terpenes.name;
            const aroma = pt.has(`terpenes.${key}.aroma`)
              ? pt(`terpenes.${key}.aroma` as never)
              : entry.terpenes.aroma;
            return (
              <li key={entry.terpenes.id} className="text-sm">
                <span className="font-medium">{name}</span>
                {entry.is_dominant && (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wider text-foreground/50">
                    ({pt("dominant")})
                  </span>
                )}
                <span className="text-foreground/60"> — {aroma}</span>
              </li>
            );
          })}
        </ul>
      ),
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="px-3 py-4 md:px-4">
      <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground/80">
        {pt("strainScience")} — {props.productName}
      </h2>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-foreground/10 last:border-b-0"
            >
              <th
                scope="row"
                className="w-1/3 py-2.5 pr-4 text-left align-top text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-foreground/55"
              >
                {row.label}
              </th>
              <td className="py-2.5 align-top text-foreground/90">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
