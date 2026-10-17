#!/usr/bin/env node
/**
 * Optimize videos in `public/videos/` for web delivery.
 *
 * For each `*.mp4` / `*.mov` / `*.webm` in `public/videos/` (non-recursive,
 * skips the `optimized/` folder itself) this script writes artifacts at TWO
 * resolution tiers into `public/videos/optimized/`:
 *
 *   Desktop/laptop tier (≤1280px wide):
 *     <name>.mp4   — H.264 / AAC, faststart, CRF 26
 *     <name>.webm  — VP9 / Opus,   CRF 32
 *     <name>.jpg   — poster frame grabbed at ~0.5s
 *
 *   Mobile tier (≤640px wide):
 *     <name>.sm.mp4  — H.264 / AAC, CRF 28 (tighter for small screens)
 *     <name>.sm.webm — VP9 / Opus,  CRF 34
 *
 * Requirements: `ffmpeg` available on PATH.
 * Run with: `pnpm optimize:videos` (use `--force` to re-encode).
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { extname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const SRC_DIR = join(ROOT, "public", "videos");
const OUT_DIR = join(SRC_DIR, "optimized");

const FORCE = process.argv.includes("--force");
const SUPPORTED = new Set([".mp4", ".mov", ".webm", ".m4v"]);

function ensureFfmpeg() {
  const r = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (r.status !== 0) {
    console.error("[optimize-videos] ffmpeg not found on PATH. Install from https://ffmpeg.org/download.html");
    process.exit(1);
  }
}

function shouldSkip(srcPath, outPath) {
  if (FORCE) return false;
  if (!existsSync(outPath)) return false;
  return statSync(outPath).mtimeMs >= statSync(srcPath).mtimeMs;
}

function run(label, args) {
  const start = Date.now();
  process.stdout.write(`  - ${label}… `);
  try {
    execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    process.stdout.write(`ok (${((Date.now() - start) / 1000).toFixed(1)}s)\n`);
  } catch (err) {
    process.stdout.write("FAIL\n");
    console.error(err?.stderr?.toString?.() ?? err);
    process.exitCode = 1;
  }
}

function humanSize(p) {
  try {
    const mb = statSync(p).size / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  } catch {
    return "?";
  }
}

function optimizeOne(srcPath) {
  const name = basename(srcPath, extname(srcPath));
  const mp4Out = join(OUT_DIR, `${name}.mp4`);
  const webmOut = join(OUT_DIR, `${name}.webm`);
  const mp4SmOut = join(OUT_DIR, `${name}.sm.mp4`);
  const webmSmOut = join(OUT_DIR, `${name}.sm.webm`);
  const posterOut = join(OUT_DIR, `${name}.jpg`);

  console.log(`\n[${basename(srcPath)}] (${humanSize(srcPath)})`);

  // ── Desktop/laptop tier: ≤1280px wide ────────────────────────────────────
  // H.264 MP4 — universal fallback, +faststart for progressive playback.
  if (!shouldSkip(srcPath, mp4Out)) {
    run("desktop mp4 (h264)", [
      "-y",
      "-i", srcPath,
      "-vf", "scale='min(1280,iw)':-2",
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "26",
      "-pix_fmt", "yuv420p",
      "-profile:v", "high",
      "-level", "4.0",
      "-movflags", "+faststart",
      "-c:a", "aac",
      "-b:a", "96k",
      "-ac", "2",
      mp4Out,
    ]);
  } else {
    console.log("  - desktop mp4 (h264)… up-to-date");
  }

  // VP9 WebM — ~30% smaller than H.264 at equivalent quality for modern browsers.
  if (!shouldSkip(srcPath, webmOut)) {
    run("desktop webm (vp9)", [
      "-y",
      "-i", srcPath,
      "-vf", "scale='min(1280,iw)':-2",
      "-c:v", "libvpx-vp9",
      "-b:v", "0",
      "-crf", "32",
      "-row-mt", "1",
      "-deadline", "good",
      "-cpu-used", "2",
      "-pix_fmt", "yuv420p",
      "-c:a", "libopus",
      "-b:a", "80k",
      webmOut,
    ]);
  } else {
    console.log("  - desktop webm (vp9)… up-to-date");
  }

  // ── Mobile tier: ≤640px wide, tighter CRF ────────────────────────────────
  if (!shouldSkip(srcPath, mp4SmOut)) {
    run("mobile mp4 (h264)", [
      "-y",
      "-i", srcPath,
      "-vf", "scale='min(640,iw)':-2",
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "28",
      "-pix_fmt", "yuv420p",
      "-profile:v", "main",
      "-level", "3.1",
      "-movflags", "+faststart",
      "-c:a", "aac",
      "-b:a", "64k",
      "-ac", "2",
      mp4SmOut,
    ]);
  } else {
    console.log("  - mobile mp4 (h264)… up-to-date");
  }

  if (!shouldSkip(srcPath, webmSmOut)) {
    run("mobile webm (vp9)", [
      "-y",
      "-i", srcPath,
      "-vf", "scale='min(640,iw)':-2",
      "-c:v", "libvpx-vp9",
      "-b:v", "0",
      "-crf", "34",
      "-row-mt", "1",
      "-deadline", "good",
      "-cpu-used", "2",
      "-pix_fmt", "yuv420p",
      "-c:a", "libopus",
      "-b:a", "56k",
      webmSmOut,
    ]);
  } else {
    console.log("  - mobile webm (vp9)… up-to-date");
  }

  // Poster frame (JPG) at ~0.5s.
  if (!shouldSkip(srcPath, posterOut)) {
    run("poster (jpg)", [
      "-y",
      "-ss", "00:00:00.500",
      "-i", srcPath,
      "-frames:v", "1",
      "-vf", "scale='min(1280,iw)':-2",
      "-q:v", "4",
      posterOut,
    ]);
  } else {
    console.log("  - poster (jpg)… up-to-date");
  }

  if (existsSync(mp4Out)) console.log(`    desktop mp4  -> ${humanSize(mp4Out)}`);
  if (existsSync(webmOut)) console.log(`    desktop webm -> ${humanSize(webmOut)}`);
  if (existsSync(mp4SmOut)) console.log(`    mobile  mp4  -> ${humanSize(mp4SmOut)}`);
  if (existsSync(webmSmOut)) console.log(`    mobile  webm -> ${humanSize(webmSmOut)}`);
  if (existsSync(posterOut)) console.log(`    poster  jpg  -> ${humanSize(posterOut)}`);
}

function main() {
  ensureFfmpeg();

  if (!existsSync(SRC_DIR)) {
    console.error(`[optimize-videos] source dir not found: ${SRC_DIR}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const entries = readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && SUPPORTED.has(extname(e.name).toLowerCase()))
    .map((e) => join(SRC_DIR, e.name));

  if (entries.length === 0) {
    console.log("[optimize-videos] no videos found in public/videos/");
    return;
  }

  console.log(`[optimize-videos] processing ${entries.length} file(s)${FORCE ? " (--force)" : ""}`);
  for (const f of entries) optimizeOne(f);
  console.log("\n[optimize-videos] done.");
}

main();
