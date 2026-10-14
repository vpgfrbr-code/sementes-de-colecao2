/**
 * Magic-byte sniffing for uploaded files.
 *
 * MIME types reported via multipart form data come from the client (the
 * browser, but ultimately controllable by an attacker). Validating the file
 * extension or `file.type` alone is not enough — a malicious payload can be
 * uploaded labeled as `image/jpeg`. We confirm the actual binary signature
 * before accepting an upload.
 */

const SIGNATURES: Array<{
  mime: string;
  match: (buf: Uint8Array) => boolean;
}> = [
  // JPEG: FF D8 FF
  {
    mime: "image/jpeg",
    match: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  {
    mime: "image/png",
    match: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  // GIF: 47 49 46 38 (37|39) 61
  {
    mime: "image/gif",
    match: (b) =>
      b.length >= 6 &&
      b[0] === 0x47 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x38 &&
      (b[4] === 0x37 || b[4] === 0x39) &&
      b[5] === 0x61,
  },
  // WEBP: RIFF....WEBP — bytes 0..3 = 'RIFF', 8..11 = 'WEBP'
  {
    mime: "image/webp",
    match: (b) =>
      b.length >= 12 &&
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
  // PDF: 25 50 44 46  ('%PDF')
  {
    mime: "application/pdf",
    match: (b) =>
      b.length >= 4 &&
      b[0] === 0x25 &&
      b[1] === 0x50 &&
      b[2] === 0x44 &&
      b[3] === 0x46,
  },
  // MP4 / video container: bytes 4..7 = 'ftyp'
  {
    mime: "video/mp4",
    match: (b) =>
      b.length >= 12 &&
      b[4] === 0x66 &&
      b[5] === 0x74 &&
      b[6] === 0x79 &&
      b[7] === 0x70,
  },
  // WebM / Matroska: 1A 45 DF A3
  {
    mime: "video/webm",
    match: (b) =>
      b.length >= 4 &&
      b[0] === 0x1a &&
      b[1] === 0x45 &&
      b[2] === 0xdf &&
      b[3] === 0xa3,
  },
];

/**
 * Returns the detected MIME type from the buffer's magic bytes, or null if
 * the signature doesn't match any of the supported formats.
 */
export function detectMimeFromBytes(buf: Uint8Array): string | null {
  for (const sig of SIGNATURES) {
    if (sig.match(buf)) return sig.mime;
  }
  return null;
}

/**
 * Validates that the actual file bytes match one of the allowed MIME types.
 * Treats `video/mp4` as matching any "ftyp"-prefixed container (mov, m4v also
 * begin with the same signature — accept if the caller allowlists video/mp4).
 */
export function isAllowedFileBytes(
  buf: Uint8Array,
  allowedMimes: Set<string>
): boolean {
  const detected = detectMimeFromBytes(buf);
  if (!detected) return false;
  return allowedMimes.has(detected);
}
