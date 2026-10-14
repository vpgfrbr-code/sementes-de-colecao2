/**
 * PII masking helpers — used to reduce exposure of customer data in admin
 * listings, logs, and shared screens. Full PII should only be revealed on
 * dedicated detail pages where the admin has explicitly drilled in.
 */

/**
 * Returns initials of a person's name, e.g. "João Silva" -> "J. S.".
 * Returns "—" for empty input.
 */
export function maskName(fullName: string | null | undefined): string {
  if (!fullName) return "—";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts.map((p) => `${p[0]!.toUpperCase()}.`).join(" ");
}

/**
 * Masks an email, e.g. "joao.silva@gmail.com" -> "j••••a@g•••l.com".
 * Returns "—" for empty input.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return "—";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const tld = dot > 0 ? domain.slice(dot) : "";
  const domainName = dot > 0 ? domain.slice(0, dot) : domain;

  const maskPart = (s: string) => {
    if (s.length <= 2) return s[0] + "•";
    return `${s[0]}${"•".repeat(Math.min(4, s.length - 2))}${s[s.length - 1]}`;
  };

  return `${maskPart(local)}@${maskPart(domainName)}${tld}`;
}
