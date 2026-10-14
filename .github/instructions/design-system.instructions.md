---
applyTo: "src/**"
description: "Visual design system for SementesDeColecao.com. Use when building any UI component, page, or layout."
---

# SementesDeColecao.com — Design System

## Brand Identity

**Industrial botanical specimen catalog.** The visual language merges vintage packaging design (coffee labels, apothecary cards, editorial print) with scientific data visualization. Every element lives inside a bordered compartment. Information is dense, typographic, and near-monochrome — color enters only through data (terpene dots, gauge fills, gradients). The site feels like holding a printed specimen sheet, not browsing an app.

**Reference mood:** Kenya coffee bag labels, Tatte Bakery editorial print, Byron Bay skincare packaging, vintage seed catalog inserts.

## Art Direction Principles

1. **Ruled-line architecture** — Every section is a bordered compartment. Thick top/bottom borders on cards, hairline internal dividers, dashed sub-section separators. Nothing floats.
2. **Near-monochrome frame, color through data** — Card frames use `foreground` at varying opacities. Color is reserved for data visualization only: terpene color dots, arc gauge fills, monogram gradients, bar charts.
3. **Typographic specimen hierarchy** — Dramatic scale contrast between Archivo display headers (14px tracked caps) and Space Mono micro-labels (8-10px with 0.25em tracking). Space Grotesk only for body descriptions.
4. **Stamp & seal motifs** — Circular seals with SVG text-path rings, rotated stamp badges (`-rotate-2`), specimen numbers from product IDs. These replace pill badges and rounded tags.
5. **Print registration marks** — `<CropMarks>` component at corners and edges of major cards. Crosshair circles, L-shaped corner marks, center-edge plus signs.
6. **Sharp geometry for data cards** — `rounded-none` on industrial/specimen cards. This contrasts with the softer `rounded-xl` on generic UI (buttons, inputs, hero) and creates the "printed insert" effect.
7. **Pattern textures** — `dot-grid-bg`, `crosshatch-bg`, `line-pattern-bg` at 2-3% opacity as card overlays. Never dominant, always barely perceptible.

## Color Usage

| Token | Role | Usage |
|-------|------|-------|
| `primary` | Deep forest green | CTAs, links, active states, monogram gradient start |
| `secondary` | Warm sand | Page backgrounds, subtle sections |
| `accent` | Terracotta | Highlights, price tags |
| `muted` | Soft muted | Disabled states |
| `sage` | Sage green | CBD gauge fill, secondary badges |
| `moss` | Moss green | Monogram gradient end, hover states |
| `bark` | Dark bark | Footer, dark sections |
| `clay` | Warm clay | Autoflower gradients |
| `foreground` at opacity | Ink black | Card borders, ruled lines, labels, crop marks. Use `/10` to `/40` for dividers, `/50` to `/80` for labels |

**Industrial card color rule:** The card itself uses only `foreground` at varying opacities + `bg-card`. Color only appears inside data elements (terpene dots, arc gauges, monogram circle, bar charts).

## Typography

| Element | Font | Class | Weight |
|---------|------|-------|--------|
| Body text | Archivo | `font-sans` | 400-500 |
| Display headings | Archivo | `font-display` | 400-700 |
| Data / labels / prices | Space Mono | `font-mono` | 400-700 |

### Typographic Scale (Industrial Cards)

| Role | Size | Font | Tracking | Example |
|------|------|------|----------|---------|
| Card section header | `text-sm` (14px) | `font-display font-bold uppercase` | `tracking-[0.2em]` | "STRAIN SCIENCE" |
| Stat cell value | `text-sm` (14px) | `font-mono font-bold uppercase` | `tracking-tight` | "FEMINIZED" |
| Stat cell label | `text-[9px]` | `font-mono uppercase` | `tracking-[0.25em]` | "SEED TYPE" |
| Specimen number | `text-[9px]` | `font-mono uppercase` | `tracking-[0.15em]` | "No. A7F3" |
| Footer metadata | `text-[8px]` | `font-mono uppercase` | `tracking-[0.2em]` | "SEMENTES DE COLECAO" |
| Terpene name | `text-sm` (14px) | `font-mono font-bold` | default | "Mirceno" |
| Terpene aroma | `text-[11px]` | `font-mono` | default | "Terroso, almiscarado" |
| Stamp badge | `text-[8px]` | `font-mono font-bold uppercase` | `tracking-[0.15em]` | "DOMINANT" |

### General Typography Rules

- Hero headings: `font-display text-5xl md:text-7xl tracking-tight`
- Section titles: `font-display text-3xl md:text-4xl`
- Body: `font-sans text-base`
- Prices: `font-mono text-lg font-medium`
- Use `text-foreground/40` to `text-foreground/80` for industrial labels (not `text-muted-foreground`)
- Use `text-muted-foreground` only for generic UI outside specimen cards

## Shape Language

### Generic UI (hero, buttons, inputs, checkout)
- **Cards**: `rounded-xl` (0.75rem) — softened but not bubbly
- **Buttons**: `rounded-full` for primary CTAs, `rounded-lg` for secondary
- **Images**: `rounded-2xl` with `overflow-hidden`
- **Inputs**: Default shadcn with `rounded-lg`

### Industrial / Specimen Elements
- **Strain card**: `rounded-none` — sharp corners, thick `border-t-[3px] border-b-[3px] border-foreground`
- **Product listing card**: `rounded-none` with `border-t-[2px] border-t-foreground`
- **Stat cells**: No radius, separated by `border-foreground/10` ruled lines
- **Terpene cells**: No radius, `border-b border-r border-foreground/10`, 3px left border in terpene color
- **Bar charts**: No radius (`rounded-none`), with tick marks at 0/25/50/75/100%
- **Stamp badges**: `border px-1.5 py-0.5 -rotate-2` — rotated for natural placement
- **Out-of-stock**: Rotated stamp style, not pill badge

### Containers & Dividers
- Use generous padding (`p-8 md:p-12`)
- **Grid**: Asymmetric bento-style for editorial sections, compartmentalized grid for data
- **Ruled dividers** (import `<RuledDivider>` from `@/components/product/ruled-divider`):
  - `variant="thin"` — `h-px bg-foreground/10`
  - `variant="thick"` — thin edges with 2px center bar
  - `variant="dashed"` — repeating linear-gradient dashes
  - `variant="ornamental"` — thin line + center dot motif (use in headers/footers)

## Industrial Card Components

### Imports

```tsx
import { CropMarks } from "@/components/product/crop-marks";
import { RuledDivider } from "@/components/product/ruled-divider";
import { SealStamp } from "@/components/product/seal-stamp";
```

### Card Frame Pattern

```tsx
{/* Outer wrapper with padding for crop marks */}
<div className="relative p-4 md:p-5">
  <CropMarks />
  {/* Inner card */}
  <div className="relative border-t-[3px] border-b-[3px] border-foreground
    border-x border-x-foreground/40 bg-card overflow-hidden">
    {/* Dot-grid texture */}
    <div className="dot-grid-bg absolute inset-0 text-foreground" />

    {/* Header bar */}
    <div className="relative border-b border-foreground/20 px-5 py-3">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-bold uppercase tracking-[0.2em]">
          SECTION TITLE
        </span>
        <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-foreground/40">
          No. {id.slice(0, 4).toUpperCase()}
        </span>
      </div>
      <RuledDivider variant="ornamental" className="mt-2" />
    </div>

    {/* Content compartments */}
    {/* ... */}

    {/* Footer bar */}
    <div className="border-t border-foreground/20 px-5 py-2.5">
      <span className="text-[8px] font-mono font-semibold uppercase tracking-[0.25em] text-foreground/30">
        SEMENTES DE COLECAO
      </span>
    </div>
  </div>
</div>
```

### Compartmentalized Stats Row

Each stat is a bordered cell. Vertical ruled lines between cells on desktop. Vertical stack on mobile.

```tsx
<div className="grid md:grid-cols-4 items-stretch">
  <div className="flex flex-col gap-1.5 px-4 py-3.5 text-center
    border-b md:border-b-0 md:border-r border-foreground/10">
    <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-foreground/40">
      LABEL
    </span>
    <span className="text-sm font-mono font-bold uppercase">VALUE</span>
  </div>
  {/* ... more cells */}
</div>
```

### Stamp Badge Pattern

Replace pill badges with rotated stamp labels:

```tsx
<span className="inline-block text-[8px] font-mono font-bold uppercase
  tracking-[0.15em] border px-1.5 py-0.5 -rotate-2"
  style={{ color, borderColor: `${color}60` }}>
  DOMINANT
</span>
```

### SealStamp Component

Circular seal with SVG text-path for seed bank logos, certifications:

```tsx
<SealStamp
  topText="Seed Bank Name"
  bottomText="Certified"
  centerContent={<Icon className="h-4 w-4" />}
  size={72}
  rotation={-12}
/>
```

## Animation Primitives (Text & Numbers)

### AnimatedHeading

Use `<AnimatedHeading>` for all section titles and hero headings. Wraps `TextAnimate` with `once` enforced.

```tsx
import { AnimatedHeading } from "@/components/animated-heading";

<AnimatedHeading
  as="h1"
  animation="blurInUp"
  by="word"
  delay={0.1}
  className="font-display text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl"
>
  {t("heroHeading")}
</AnimatedHeading>
```

**Available animations:** `fadeIn` | `blurIn` | `blurInUp` | `blurInDown` | `slideUp` | `slideDown` | `slideLeft` | `slideRight` | `scaleUp` | `scaleDown`

**Animate by:** `text` | `word` | `character` | `line`

**Default pairing:** `blurInUp` + `by="word"` for headings, `fadeIn` + `by="word"` for subtitles/body copy.

### TextAnimate

Use `<TextAnimate>` (from `@/components/ui/text-animate`) directly when you need finer control (e.g. inside `HeroBanner` overlays). `AnimatedHeading` is the preferred wrapper for page headings.

### NumberTicker

Animated spring counter for stats and countdown digits. Animates on scroll entry (once).

```tsx
import { NumberTicker } from "@/components/ui/number-ticker";

<NumberTicker value={42} className="font-mono text-foreground" />
```

- Use with a `mounted` gate to prevent SSR mismatch (render static string until after mount)
- Default spring: `damping: 60, stiffness: 100`

### DotPattern (SVG Component)

`<DotPattern>` from `@/components/ui/dot-pattern` is a React SVG component distinct from the CSS `dot-grid-bg` utility class.

| Use | Approach |
|-----|----------|
| Section background overlay | `<DotPattern>` (SVG, configurable density, optional glow, radial mask) |
| Inline card texture | `dot-grid-bg` CSS class |

```tsx
import { DotPattern } from "@/components/ui/dot-pattern";

{/* Faint radial-fade dot bg on a card or section */}
<div className="relative overflow-hidden">
  <DotPattern
    width={12} height={12} cr={0.5}
    className="text-foreground opacity-[0.025]
      [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_70%)]"
  />
  ...
</div>
```

## Motion Principles

Import from `@/components/motion`. All animations trigger once on scroll.

| Component | Use for |
|-----------|---------|
| `<FadeUp>` | Default entrance for any block |
| `<ScaleIn>` | Cards, images, featured items |
| `<StaggerGroup>` + `<StaggerItem>` | Product grids, lists |
| `<ImageReveal>` | Hero images, gallery items |
| `<HoverLift>` | Interactive cards, product cards |

Rules:
1. Elements enter from below (`FadeUp`) — like seeds growing upward
2. Stagger grid children at 80ms intervals
3. Cards lift on hover (`HoverLift`, y: -6px)
4. Images reveal with clip-path wipe
5. Never animate text content directly — animate the container
6. Use `viewport={{ once: true }}` — animations play once only
7. Arc gauges and bar charts animate with `whileInView` on scroll
8. Stamp badges use `animate-stamp` keyframe (scale + rotate entrance)

## Spacing & Layout

- Page max-width: `max-w-7xl mx-auto`
- Section padding: `py-16 md:py-24`
- Card internal: `p-5 md:p-6` (industrial cards), `p-6` (generic cards)
- Grid gaps: `gap-4 md:gap-6`
- Industrial card outer padding: `p-4 md:p-5` (space for crop marks)
- Leave whitespace generously — premium feel requires breathing room
- **Hero underlay**: Pages with a full-bleed hero (banner or video) use `-mt-16 md:-mt-20` on the top-level wrapper to slide underneath the sticky header

## Component Patterns (shadcn)

- **Button primary**: `<Button>` (uses primary color, `rounded-full`, uppercase tracking-wide)
- **Button secondary**: `<Button variant="outline">` with `rounded-lg`
- **Card product**: `<Card>` + `<HoverLift>`, `rounded-none`, thick top border, image full-bleed, ruled compartment below with name + seed type + price
- **Badge**: Avoid pill badges on industrial elements. Use stamp pattern instead. `<Badge variant="secondary">` only for generic UI.
- **Sheet**: For cart drawer, slide from right
- **Input**: Default shadcn with `rounded-lg`
- **Separator**: Use `<RuledDivider>` inside industrial cards. `<Separator>` only for generic UI.

## Page-Level Patterns

### Hero Banner (`HeroBanner`)

Full-bleed carousel with autoplay. Video and image slides supported.

- Aspect ratio: `aspect-[4/5] md:aspect-[21/9]`
- Video slide: `<video autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />`
- Mobile/desktop images: `image_url_mobile` with `md:hidden`, `image_url` with `hidden md:block`
- Text overlay: `bg-gradient-to-t from-foreground/60 via-foreground/20 to-transparent`, anchored to bottom
- Text uses `TextAnimate` (blurInUp for title, fadeIn for subtitle), `text-primary-foreground`
- Carousel dot indicators: `h-1.5 rounded-full`; active = `w-6 bg-primary-foreground`; inactive = `w-1.5 bg-primary-foreground/50 hover:bg-primary-foreground/70`

### Featured Section Header Pattern

Used before featured grids and catalog sections:

```tsx
<FadeUp>
  <div className="mb-3 flex items-end justify-between">
    <AnimatedHeading
      as="h2"
      animation="slideUp"
      by="word"
      className="font-display text-3xl font-bold tracking-tight md:text-4xl"
    >
      {title}
    </AnimatedHeading>
    <Button variant="outline" size="sm" className="rounded-full font-mono text-[11px] uppercase tracking-[0.1em]">
      {t("viewAll")}
    </Button>
  </div>
  <RuledDivider variant="ornamental" className="mb-10" />
</FadeUp>
```

### Dark Hero Section (`bg-bark`)

Used for featured product landing intro and similar immersive dark sections:

- Background: `bg-bark text-white`
- Cursor-follow glow (desktop only): `radial-gradient(600px circle at X% Y%, rgba(255 255 255 / 0.06), transparent 60%)`, `pointer-events-none hidden md:block opacity-30`
- Back navigation: `font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 hover:text-white/70`
- Eyebrow label: `font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-white/45`
- `RuledDivider variant="ornamental"` with `opacity-30`
- Grid: `sm:grid-cols-2`, text left, media right (video at `max-w-[min(100%,280px)] sm:max-w-sm md:max-w-md`)

### Incentive Strip (`Incentive5`)

3-column trust badges with industrial icon boxes:

- Section: `border-y border-foreground/10 bg-muted/40` + `crosshatch-bg` overlay
- Column dividers: `md:border-l md:border-foreground/10`; mobile stacks with `RuledDivider variant="thin"`
- Icon box: `h-11 w-11 border border-foreground/20 bg-card` (no radius) + `dot-grid-bg` overlay, icon at `h-5 w-5 text-foreground/60`
- Item number: `font-mono text-[9px] uppercase tracking-[0.25em] text-foreground/30` (zero-padded "01", "02", …)
- Title: `font-display text-xs font-bold uppercase tracking-[0.15em]`

### Countdown Timer (`SaleSection5`)

Uses `NumberTicker` for live changing digits. Requires a `mounted` guard to prevent SSR mismatch.

```tsx
{mounted ? (
  <NumberTicker value={timeRemaining.seconds} className="text-foreground" />
) : (
  String(timeRemaining.seconds).padStart(2, "0")
)}
```

Digit boxes: `bg-background rounded-lg min-h-[100px]` for generic UI context. Labels: `text-muted-foreground text-sm font-medium uppercase`.

## Product Gallery Patterns

### StrainCardGallery / ProductGallery

Mixed images + videos crossfade carousel with drag-to-swipe.

- Container: `aspect-[4/5] relative overflow-hidden bg-foreground/5`
- Crossfade: `AnimatePresence mode="sync"`, `motion.div` with `opacity 0→1→0`, `duration: 0.5, ease: "easeInOut"`
- Drag-to-swipe: `drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2}`, swipe threshold `Math.abs(offset.x) * velocity.x` > 10000 or `offset.x` > 50
- Auto-advance: 3500ms, pauses on hover, pauses on `visibilitychange`
- **Film counter**: `absolute bottom-3 right-3 font-mono text-[9px] tabular-nums text-white/60` — format `"01 / 04"`
- **Dot indicators** (max 8 dots): `h-[3px] rounded-full`; active = `w-5 bg-white`; inactive = `w-[5px] bg-white/40 hover:bg-white/70`

## Status Badge Patterns

All status badges follow the stamp aesthetic — no pill badges on industrial pages.

### In Stock

```tsx
<span className="inline-block -rotate-1 border border-foreground/30 px-2 py-0.5
  font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-foreground/60">
  <Check className="mr-1 inline h-3 w-3 -mt-0.5" />
  {t("inStock")}
</span>
```

### Out of Stock

```tsx
<span className="inline-block -rotate-2 border border-destructive/50 bg-destructive/5
  px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-destructive">
  {t("outOfStock")}
</span>
```

### On Sale (dark context)

```tsx
<span className="inline-block rotate-1 border border-red-400/50 bg-red-500/20
  px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-red-300">
  <Percent className="mr-1 inline h-3 w-3 -mt-0.5" />
  {t("onSale")}
</span>
```

## StrainMonogram — Seed Type Gradients

| Seed type | Gradient |
|-----------|----------|
| feminized | `primary` → `moss` |
| autoflower | `accent` → `clay` |
| regular | `bark` → `muted` |
| (fallback) | `primary` → `moss` |

Abbreviations: `FEM` / `AUTO` / `REG`

## CSS Pattern Utilities

Available in `globals.css`:

| Class | Effect |
|-------|--------|
| `dot-grid-bg` | Radial dot grid at 2.5% opacity |
| `crosshatch-bg` | Diagonal crosshatch lines at 2% opacity |
| `line-pattern-bg` | Vertical fine lines at 2.5% opacity |
| `animate-stamp` | Scale + rotate entrance for stamp elements |

Usage: Apply as an `absolute inset-0` overlay inside a `relative` container with `text-foreground`.

## Do / Don't

- DO use `font-display` for section headers inside industrial cards
- DO use `font-mono` for all data labels, values, metadata, and prices
- DO use `foreground` at opacity for industrial borders (not `border-border`)
- DO pair sharp corners on data cards with soft corners on generic UI
- DO use `<CropMarks>` on major specimen cards
- DO use `<RuledDivider variant="ornamental">` after header bars
- DO use stamp-style badges (`-rotate-2`, border, mono font)
- DO separate THC and CBD into individual stat cells
- DO add dot-grid or crosshatch texture overlays on specimen cards
- DO use compartmentalized grids where each stat has its own bordered cell
- DO use `<AnimatedHeading>` (not bare `TextAnimate`) for page section titles
- DO use `DotPattern` SVG component for large section backgrounds; use `dot-grid-bg` CSS class for small card inlays
- DO use the film counter (`00 / 00`, `font-mono text-[9px] tabular-nums`) on all product image/video carousels
- DO use drag-to-swipe (`drag="x"`) + crossfade (`AnimatePresence mode="sync"`) on product galleries
- DO apply `-mt-16 md:-mt-20` on pages whose first element is a full-bleed hero that should underlay the sticky header
- DON'T use emojis — use Lucide icons
- DON'T use `rounded-xl` on industrial/specimen elements
- DON'T use `border-border` inside specimen cards — use `border-foreground/10` to `border-foreground/20`
- DON'T use pill badges (`rounded-full`) for status labels on specimen cards
- DON'T center-align body text blocks
- DON'T use more than 2 font weights per element
- DON'T skip whitespace between sections
- DON'T add color to the card frame — keep it monochrome, color only in data viz
