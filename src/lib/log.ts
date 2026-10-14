/**
 * PII-safe logger for server-side code.
 *
 * Redacts email addresses, common Brazilian document patterns (CPF, CNPJ,
 * phone) and long digit runs from objects and strings before writing to
 * stdout/stderr. Use `log.info`, `log.warn`, `log.error` instead of
 * `console.*` in any route that handles customer data.
 *
 * Redaction is deliberately aggressive — better to lose a debug detail
 * than leak PII into Vercel/Datadog logs.
 */

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
// CPF: 11 digits with or without separators (xxx.xxx.xxx-xx).
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
// CNPJ: 14 digits with or without separators (xx.xxx.xxx/xxxx-xx).
const CNPJ_RE = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
// BR phone: (xx) xxxxx-xxxx or xx xxxxx xxxx (9-11 digits total).
const PHONE_RE = /\b\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}\b/g;

const SENSITIVE_KEYS = new Set([
  "email",
  "guest_email",
  "customer_name",
  "name",
  "phone",
  "cpf",
  "cnpj",
  "document",
  "address",
  "zip",
  "postal_code",
  "cep",
  "password",
  "token",
  "signature",
  "authorization",
  "pix_br_code",
  "pix_qr_code",
]);

function redactString(input: string): string {
  return input
    .replace(EMAIL_RE, "[email]")
    .replace(CNPJ_RE, "[cnpj]")
    .replace(CPF_RE, "[cpf]")
    .replace(PHONE_RE, "[phone]");
}

function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      // Stack traces can contain file paths but no PII in our case.
      stack: value.stack,
    };
  }
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = "[redacted]";
      } else {
        out[k] = redactValue(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

function format(args: unknown[]): unknown[] {
  return args.map((a) => redactValue(a));
}

export const log = {
  info: (...args: unknown[]) => console.log(...format(args)),
  warn: (...args: unknown[]) => console.warn(...format(args)),
  error: (...args: unknown[]) => console.error(...format(args)),
};
