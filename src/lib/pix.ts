/**
 * PIX BR Code (EMV QR Code) generator
 * Spec: Banco Central do Brasil — Manual de Padrões para Iniciação do Pix
 * Format: EMV QRCPS-MPM (Merchant Presented Mode)
 */

/** Build a TLV (tag-length-value) field: ID + 2-digit padded length + value */
function tlv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

/** CRC-16/CCITT-FALSE — polynomial 0x1021, init 0xFFFF */
function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Strip diacritics and non-ASCII to produce safe PIX merchant strings */
function sanitize(str: string, maxLen: number): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove combining accents
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .slice(0, maxLen)
    .trim();
}

export interface PixBrCodeParams {
  /** PIX key (email, CPF, phone, or EVP UUID) */
  key: string;
  /** Amount in BRL cents (e.g. 50000 = R$500,00) */
  amountBrlCents: number;
  /** Visible merchant name — max 25 chars, ASCII only */
  merchantName?: string;
  /** Merchant city — max 15 chars, ASCII only */
  merchantCity?: string;
  /**
   * Transaction ID (txid) — identifies this specific payment.
   * Max 25 alphanumeric chars. Used as reference label in tag 62.05.
   */
  txId: string;
}

/**
 * Generate a PIX "copia e cola" BR code string.
 * The returned string can be:
 *  - Copied directly by the payer ("Pix Copia e Cola")
 *  - Encoded into a QR code image for scanning
 */
export function generatePixBrCode({
  key,
  amountBrlCents,
  merchantName = "SEMENTES DE COLECAO",
  merchantCity = "BRASIL",
  txId,
}: PixBrCodeParams): string {
  const name = sanitize(merchantName, 25) || "N";
  const city = sanitize(merchantCity, 15) || "C";
  const cleanTxId = txId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "SEMENTESDECOL";

  // Format amount as "500.00"
  const amount = (amountBrlCents / 100).toFixed(2);

  // Tag 26 — Merchant Account Information
  const mai = tlv("26", tlv("00", "BR.GOV.BCB.PIX") + tlv("01", key));

  // Tag 62 — Additional Data Field Template (tag 05 = reference label / txid)
  const adf = tlv("62", tlv("05", cleanTxId));

  // Full payload up to CRC placeholder
  const payload =
    tlv("00", "01") +    // Payload Format Indicator
    mai +                // Merchant Account Info
    tlv("52", "0000") +  // Merchant Category Code (generic)
    tlv("53", "986") +   // Transaction Currency (BRL)
    tlv("54", amount) +  // Transaction Amount
    tlv("58", "BR") +    // Country Code
    tlv("59", name) +    // Merchant Name
    tlv("60", city) +    // Merchant City
    adf +                // Additional Data
    "6304";              // CRC tag + length (always 04)

  return payload + crc16(payload);
}

/**
 * Build a URL to render the BR code as a QR code image.
 * Uses the free, public api.qrserver.com service.
 */
export function pixBrCodeToQrUrl(brCode: string, size = 256): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=M&data=${encodeURIComponent(brCode)}`;
}
