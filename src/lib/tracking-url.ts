/**
 * Build a public tracking URL for a given carrier + tracking code.
 * Returns null when no URL template is known for the carrier.
 */
export function getTrackingUrl(
  carrier: string | null | undefined,
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  const c = (carrier ?? "").trim().toLowerCase();
  const encoded = encodeURIComponent(code.trim());

  if (!c || c.includes("correio") || c === "sedex" || c === "pac")
    return `https://rastreamento.correios.com.br/app/index.php?objeto=${encoded}`;

  if (c.includes("jadlog"))
    return `https://www.jadlog.com.br/tracking?cte=${encoded}`;

  if (c.includes("loggi"))
    return `https://www.loggi.com/rastreador/?tracking_key=${encoded}`;

  if (c.includes("dhl"))
    return `https://www.dhl.com/br-pt/home/tracking/tracking-express.html?submit=1&tracking-id=${encoded}`;

  if (c.includes("fedex"))
    return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`;

  if (c.includes("ups"))
    return `https://www.ups.com/track?tracknum=${encoded}`;

  if (c.includes("usps"))
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encoded}`;

  return null;
}
