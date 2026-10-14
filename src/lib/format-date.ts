/**
 * Centralized order date/time formatting with timezone awareness.
 *
 * Policy:
 * - Customer-facing views format the order timestamp in the timezone the
 *   customer's browser was in **at checkout time** (captured as a signed
 *   minutes-east-of-UTC offset and stored in `orders.customer_tz_offset`).
 *   When the offset is unknown (legacy orders, missed capture), we fall
 *   back to America/Sao_Paulo so the merchant's locale is the default.
 * - Admin-facing views always format in America/Sao_Paulo regardless of
 *   the admin's browser, so timestamps stay consistent across the team.
 *
 * Why offset (not IANA name)?
 *   The customer chose to capture only the offset (lighter payload, no
 *   library), so DST edges that occur *after* the order do not retroactively
 *   change how the order is displayed — we always show the wall-clock time
 *   the customer actually saw when placing the order.
 *
 * Implementation note:
 *   Intl.DateTimeFormat does not accept an arbitrary numeric offset, only
 *   IANA zone names. We therefore shift the UTC instant by the offset and
 *   format it as if it were UTC, then append a manual "GMT±HH:MM" suffix.
 */
export const SAO_PAULO_TZ = "America/Sao_Paulo";

const SUPPORTED_LOCALE_TAGS: Record<string, string> = {
  pt: "pt-BR",
  es: "es",
  en: "en-US",
};

function toBcp47(locale: string): string {
  return SUPPORTED_LOCALE_TAGS[locale] ?? locale;
}

/** Format a signed offset in minutes as "GMT-03:00" / "GMT+09:00" / "GMT". */
export function formatOffsetSuffix(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "GMT";
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `GMT${sign}${hh}:${mm}`;
}

type FormatOptions = {
  /** Include time-of-day. Default true. */
  withTime?: boolean;
  /** Append the GMT offset suffix in the customer formatter. Default true. */
  withOffsetSuffix?: boolean;
};

/**
 * Format an order timestamp for the customer who placed the order.
 * Falls back to America/Sao_Paulo when the offset is unknown.
 */
export function formatOrderDateForCustomer(
  iso: string | Date,
  tzOffsetMinutes: number | null | undefined,
  locale: string,
  opts: FormatOptions = {},
): string {
  const { withTime = true, withOffsetSuffix = true } = opts;
  const tag = toBcp47(locale);
  const date = typeof iso === "string" ? new Date(iso) : iso;

  if (tzOffsetMinutes === null || tzOffsetMinutes === undefined) {
    // Fallback: São Paulo, native Intl handles DST correctly via IANA.
    return new Intl.DateTimeFormat(tag, {
      timeZone: SAO_PAULO_TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(date);
  }

  // Shift instant by offset, format as UTC wall-clock, then append suffix.
  const shifted = new Date(date.getTime() + tzOffsetMinutes * 60_000);
  const formatted = new Intl.DateTimeFormat(tag, {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(shifted);

  return withOffsetSuffix
    ? `${formatted} ${formatOffsetSuffix(tzOffsetMinutes)}`
    : formatted;
}

/**
 * Format an order timestamp for an admin: always America/Sao_Paulo so the
 * team sees a consistent wall-clock regardless of where they're located.
 */
export function formatOrderDateForAdmin(
  iso: string | Date,
  locale: string,
  opts: FormatOptions = {},
): string {
  const { withTime = true } = opts;
  const tag = toBcp47(locale);
  const date = typeof iso === "string" ? new Date(iso) : iso;

  return new Intl.DateTimeFormat(tag, {
    timeZone: SAO_PAULO_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

/**
 * Idade relativa curta para listas do admin: "agora", "há 5min", "há 2h",
 * "há 3d"; após 7 dias volta para a data curta (dd/mm) em São Paulo.
 */
export function formatRelativeAge(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) return `há ${diffDays}d`;

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TZ,
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}
