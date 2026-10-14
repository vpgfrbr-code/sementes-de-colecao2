/**
 * Label for the strain card "No. …" line.
 * Priority: DB `specimen_code` (override) → iniciais do nome da semente → compacto a partir do slug → UUID hex.
 */

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}+/gu, "");
}

/** First alphanumeric of each word (max 6). Single-word: first 2 alphanumerics if only one initial. */
export function initialsFromSeedName(name: string): string | null {
  const raw = name.trim();
  if (!raw) return null;

  const words = raw.split(/[\s\-–—_/]+/).filter(Boolean);
  if (words.length === 0) return null;

  const letters = (w: string) => {
    const d = stripDiacritics(w);
    const m = d.match(/[A-Za-z0-9]/g);
    return m?.[0] ?? "";
  };

  if (words.length === 1) {
    const alnum = stripDiacritics(words[0]!).replace(/[^A-Za-z0-9]/g, "");
    if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase();
    if (alnum.length === 1) return alnum.toUpperCase();
    return null;
  }

  const ini = words.map(letters).join("").toUpperCase();
  if (ini.length >= 2) return ini.slice(0, 6);
  if (ini.length === 1) {
    const alnum = stripDiacritics(words[0]!).replace(/[^A-Za-z0-9]/g, "");
    return (ini + alnum.slice(1, 2)).toUpperCase().slice(0, 6);
  }
  return null;
}

function codeFromSlug(slug: string): string | null {
  const parts = slug.split("-").filter(Boolean);
  if (parts.length >= 2) {
    const ini = parts
      .map((p) => stripDiacritics(p).match(/[A-Za-z0-9]/)?.[0] ?? "")
      .join("")
      .toUpperCase();
    if (ini.length >= 2) return ini.slice(0, 6);
  }
  const compact = stripDiacritics(slug).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return compact.length ? compact.slice(0, 6) : null;
}

export function formatProductSpecimenNo(product: {
  id: string;
  slug: string;
  specimen_code?: string | null;
  /** Nome traduzido da semente (locale atual); usado para gerar iniciais quando não há código manual. */
  productName?: string | null;
}): string {
  const manual = product.specimen_code?.trim();
  if (manual) return manual.toUpperCase();

  const fromName = product.productName ? initialsFromSeedName(product.productName) : null;
  if (fromName) return fromName;

  const fromSlug = codeFromSlug(product.slug);
  if (fromSlug) return fromSlug;

  const hex = product.id.replace(/-/g, "");
  return hex.slice(0, 8).toUpperCase();
}
