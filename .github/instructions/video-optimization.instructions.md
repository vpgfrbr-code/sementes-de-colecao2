---
applyTo: "src/**,scripts/optimize-videos.mjs,public/videos/**"
description: "Video delivery pipeline for SementesDeColecao.com. Use when adding videos to the gallery, product pages, banners, or any component that plays video."
---

# Video Optimization Pipeline

Videos are **always pre-encoded** into two resolution tiers with two codecs each, plus a JPG poster frame. The `LazyVideo` component then auto-negotiates the best variant per viewport + browser.

## The rules

1. **Never** drop a raw `.mp4` straight into a component. Always use `<LazyVideo>` from `@/components/lazy-video`.
2. **Never** render a raw `<video>` element in customer-facing pages. Raw `<video>` is only acceptable in admin previews (`src/components/admin/**`).
3. Local videos live in `public/videos/*.mp4`. After adding or replacing one, run `pnpm optimize:videos` and commit the generated files under `public/videos/optimized/`.
4. `LazyVideo` accepts `src="/videos/<name>.mp4"` and automatically derives all optimized sources + poster. Do not hand-wire `<source>` tags unless the video lives outside `/videos/` (e.g. Supabase Storage uploads).

## The pipeline (`pnpm optimize:videos`)

Script: `scripts/optimize-videos.mjs`. Requires `ffmpeg` on PATH.

For every `*.mp4 | *.mov | *.webm | *.m4v` in `public/videos/` (non-recursive) it produces:

| Output | Width cap | Codec | Quality | Use case |
|---|---|---|---|---|
| `<name>.mp4` | 1280px | H.264 / AAC (`+faststart`) | CRF 26, `slow` preset | Desktop Safari / universal fallback |
| `<name>.webm` | 1280px | VP9 / Opus | CRF 32 | Desktop Chrome/Firefox (~30% smaller than MP4) |
| `<name>.sm.mp4` | 640px | H.264 / AAC | CRF 28 | Mobile Safari iOS |
| `<name>.sm.webm` | 640px | VP9 / Opus | CRF 34 | Mobile Chrome/Firefox |
| `<name>.jpg` | 1280px | JPEG @ q4 | Grabbed at 0.5s | Poster placeholder |

The script is **idempotent** — skips outputs newer than source. Use `pnpm optimize:videos -- --force` to re-encode everything.

**Typical savings:** original 10–20 MB clips collapse to 0.7–3 MB (desktop) and 0.2–0.9 MB (mobile) — ~85% desktop / ~92% mobile with no perceptible quality loss at the sizes the site actually renders video.

## The player (`LazyVideo`)

Location: [src/components/lazy-video.tsx](../../src/components/lazy-video.tsx)

Behavior:
- Mounts the `<video>` element only when within **200px of the viewport** (`IntersectionObserver`). Off-screen videos render the poster as `<img loading="lazy">` instead — zero decoder cost, zero wasted bytes.
- Emits `<source>` tags in this order so the browser picks the smallest compatible file:
  ```
  .sm.webm  media="(max-width: 640px)"   → mobile Chrome/Firefox
  .sm.mp4   media="(max-width: 640px)"   → mobile Safari
  .webm                                  → desktop Chrome/Firefox
  .mp4                                   → desktop Safari / fallback
  ```
- Defaults `preload="metadata"` (never `"auto"`) to prevent progressive preloading of unwanted clips.
- Poster frame auto-derived from `/videos/optimized/<name>.jpg`.

### Usage

**Local video (auto-derive everything):**
```tsx
import { LazyVideo } from "@/components/lazy-video";

<LazyVideo
  src="/videos/seed.mp4"
  autoPlay
  loop
  muted
  playsInline
  preload="none"          // for below-the-fold; use "metadata" for LCP surfaces
  className="h-full w-full"
/>
```

**External video (Supabase Storage, etc.):** pass the URL as-is. The component detects it's not under `/videos/`, renders a single `<source>` with a guessed MIME type, and skips poster derivation. If the upstream has a poster, pass it explicitly via `poster`.

**Override props:**
- `poster?: string` — explicit poster URL (overrides auto-derived)
- `sources?: { src; type; media? }[]` — explicit source list (overrides derivation)
- `rootMargin?: string` — viewport distance before mounting (default `"200px"`)
- `mobileBreakpoint?: number` — px width for mobile tier (default `640`)

## Checklist when adding a video

1. Drop the source file in `public/videos/<name>.mp4` (prefer descriptive kebab-case names)
2. Run `pnpm optimize:videos`
3. Reference it as `<LazyVideo src="/videos/<name>.mp4" … />`
4. Commit both the original and the `public/videos/optimized/<name>.*` outputs
5. For LCP-critical hero surfaces: use `preload="metadata"` and pass a hand-picked poster if the 0.5s frame is not representative

## Admin-uploaded videos (Supabase Storage)

Uploads via [MediaManager](../../src/components/admin/media-manager.tsx) land in Supabase Storage **unoptimized**. They still benefit from `LazyVideo` (lazy mounting, poster support if provided), but they will not receive the two-tier / two-codec treatment until we add a transcoding step. Until then, advise admins to upload videos already compressed to ≤1280px H.264 MP4 under ~5 MB.

## Why this approach (and not Cloudflare Stream / Mux / HLS)

- **Free** — no external paid service, no per-minute billing.
- **Zero egress cost** — files ship from the same Next.js/Vercel CDN as the rest of the site.
- **No SPOF** — no dependency on a third-party player lib, no extra DNS, no playback auth.
- **Good enough quality** at our target resolutions. Upgrade to HLS adaptive bitrate only if we ever serve clips longer than ~15s or need resolution switching on slow connections.
