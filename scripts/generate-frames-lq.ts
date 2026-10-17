/**
 * Generate low-resolution (LQIP) tier of hero scrub frames.
 *
 * Reads every `frame_XXXX.jpg` (or .webp) in a source folder and writes a
 * downscaled `.webp` copy into a sibling `frames-lq/` folder. The component
 * <VideoScrubHero> preloads this tier in parallel so scrubbing becomes
 * interactive long before the full-resolution frames finish downloading.
 *
 * Usage:
 *   pnpm tsx scripts/generate-frames-lq.ts public/images/maracuruja/frames
 *   pnpm tsx scripts/generate-frames-lq.ts public/images/<slug>/frames --width 320 --quality 55
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

type Args = {
  srcDir: string;
  width: number;
  quality: number;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error("Usage: generate-frames-lq <srcDir> [--width N] [--quality N]");
    process.exit(1);
  }
  const srcDir = argv[0]!;
  let width = 320;
  let quality = 55;
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--width" && argv[i + 1]) {
      width = Number.parseInt(argv[++i]!, 10);
    } else if (arg === "--quality" && argv[i + 1]) {
      quality = Number.parseInt(argv[++i]!, 10);
    }
  }
  return { srcDir, width, quality };
}

async function main() {
  const { srcDir, width, quality } = parseArgs();
  const absSrc = path.resolve(srcDir);
  const outDir = path.join(path.dirname(absSrc), "frames-lq");

  const stat = await fs.stat(absSrc).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    console.error(`Source directory not found: ${absSrc}`);
    process.exit(1);
  }

  await fs.mkdir(outDir, { recursive: true });

  const entries = await fs.readdir(absSrc);
  // Prefer .jpg originals if present; otherwise fall back to .webp.
  const jpgs = entries.filter((f) => /^frame_\d+\.jpg$/i.test(f)).sort();
  const sources = jpgs.length > 0
    ? jpgs
    : entries.filter((f) => /^frame_\d+\.webp$/i.test(f)).sort();

  if (sources.length === 0) {
    console.error(`No frame_XXXX.(jpg|webp) files found in ${absSrc}`);
    process.exit(1);
  }

  console.log(`Resizing ${sources.length} frames → ${outDir}`);
  console.log(`  width: ${width}px, quality: ${quality}, format: webp`);

  let done = 0;
  const concurrency = 8;
  let cursor = 0;

  async function worker() {
    while (cursor < sources.length) {
      const i = cursor++;
      const file = sources[i]!;
      const base = file.replace(/\.(jpg|jpeg|webp|png)$/i, "");
      const outPath = path.join(outDir, `${base}.webp`);
      await sharp(path.join(absSrc, file))
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toFile(outPath);
      done++;
      if (done % 10 === 0 || done === sources.length) {
        process.stdout.write(`\r  ${done}/${sources.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  process.stdout.write("\n");

  // Report total byte size.
  const lqFiles = await fs.readdir(outDir);
  let totalBytes = 0;
  for (const f of lqFiles) {
    if (f.endsWith(".webp")) {
      const s = await fs.stat(path.join(outDir, f));
      totalBytes += s.size;
    }
  }
  console.log(`Done. Total LQ payload: ${(totalBytes / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
