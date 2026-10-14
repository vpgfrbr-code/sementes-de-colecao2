/**
 * Convert an arbitrary string into a URL-safe slug.
 * - Lowercases.
 * - Strips diacritics (NFD + combining marks).
 * - Replaces non-alphanumeric runs with `-`.
 * - Trims leading/trailing dashes.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
