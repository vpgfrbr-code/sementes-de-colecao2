/**
 * Free static map utilities using OpenStreetMap (no API key required).
 *
 * geocodeAddress() — Geocoding via Nominatim (called at checkout, result stored in DB)
 * getStaticMapUrl() — Static map image URL from cached coordinates
 */

export interface MapCoordinates {
  lat: number;
  lon: number;
}

/**
 * Geocode an address to lat/lon using OpenStreetMap Nominatim.
 * Call this server-side only (respects Nominatim usage policy).
 * Returns null if geocoding fails.
 */
export async function geocodeAddress(
  address: Record<string, string>
): Promise<MapCoordinates | null> {
  const query = [
    address.street,
    address.number,
    address.neighborhood,
    address.city,
    address.state,
    address.zip,
    "Brazil",
  ]
    .filter(Boolean)
    .join(", ");

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    // Hard 4s timeout — Nominatim can hang and we never want to block checkout.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "SementesDeColecao/1.0 (pedidos@sementesdecolecao.com)" },
      next: { revalidate: 86400 }, // Cache for 24h
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Build a static map image URL from coordinates.
 * Uses OpenStreetMap's free static map service — no API key needed.
 */
export function getStaticMapUrl(
  coords: MapCoordinates,
  opts?: { width?: number; height?: number; zoom?: number }
): string {
  const { width = 600, height = 260, zoom = 14 } = opts ?? {};

  const params = new URLSearchParams({
    center: `${coords.lat},${coords.lon}`,
    zoom: String(zoom),
    size: `${width}x${height}`,
    markers: `${coords.lat},${coords.lon},red-pushpin`,
  });

  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
}
