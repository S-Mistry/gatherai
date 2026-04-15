# GatherAI Style Guide

## Overview

GatherAI's interface aims for a **warm, editorial, evidence-first** feel — the visual register of a consultant's notebook rather than a SaaS dashboard. The system is built on:

- **Next.js 16 / React 19** with the `app/` router.
- **Tailwind CSS v4** using the CSS-first configuration (`@theme inline` in `app/globals.css`). There is no `tailwind.config.js` — tokens live as CSS variables and are surfaced to Tailwind via `@theme`.
- **shadcn/ui** (`style: "radix-maia"`, `baseColor: "mist"`) for primitive composition, with `class-variance-authority` (CVA) driving variants.
- **Radix UI primitives** for low-level behavior (Slot, etc.).
- **Phosphor Icons** (`@phosphor-icons/react`) as the sole icon library.
- **Server-inserted head bootstrap + local ThemeProvider** for light/dark switching (class-based, with a `d` keyboard hotkey to toggle).
- **OKLCH color space** for every theme color — no hex, no HSL.

The aesthetic leans heavily on **soft translucency** (`bg-white/72`, `bg-background/70`, `backdrop-blur`), **generous rounding** (pill buttons, 32px panels), and **radial color-mix gradients** on body and hero surfaces.

---

## Color Palette

All palette tokens are declared in `gather/app/globals.css` as OKLCH values under `:root` (light) and `.dark`, then aliased through `@theme inline` so Tailwind utilities like `bg-primary`, `text-muted-foreground`, `border-border` resolve correctly.

### Light Theme (`:root`)

| Token | OKLCH | Role |
|---|---|---|
| `--background` | `oklch(0.985 0.012 95.4)` | Warm off-white page background (faint yellow cast). |
| `--foreground` | `oklch(0.225 0.026 248.9)` | Deep ink-blue body text. |
| `--card` | `oklch(0.995 0.004 95)` | Near-white surfaces (slightly warmer than background). |
| `--card-foreground` | `oklch(0.225 0.026 248.9)` | Text on cards (= foreground). |
| `--popover` | `oklch(0.995 0.004 95)` | Popover surface (= card). |
| `--popover-foreground` | `oklch(0.225 0.026 248.9)` | Popover text. |
| `--primary` | `oklch(0.53 0.127 33.9)` | **Terracotta / burnt sienna** — brand accent, CTAs, links. |
| `--primary-foreground` | `oklch(0.985 0.014 84.8)` | Warm cream on primary backgrounds. |
| `--secondary` | `oklch(0.93 0.026 93.1)` | Warm cream/parchment for secondary buttons. |
| `--secondary-foreground` | `oklch(0.265 0.03 248.1)` | Dark ink on secondary. |
| `--muted` | `oklch(0.954 0.012 82.4)` | Muted surface (warm gray-cream). |
| `--muted-foreground` | `oklch(0.48 0.032 245.1)` | Muted body / captions (cool gray-blue). |
| `--accent` | `oklch(0.89 0.035 65.4)` | Warm peach accent (used for badges and hover tints). |
| `--accent-foreground` | `oklch(0.265 0.03 248.1)` | Dark ink on accent. |
| `--destructive` | `oklch(0.59 0.2 25.3)` | Saturated red-orange for destructive intent. |
| `--border` | `oklch(0.88 0.014 88.8)` | Warm-neutral hairline borders. |
| `--input` | `oklch(0.88 0.014 88.8)` | Input borders (= border). |
| `--ring` | `oklch(0.67 0.108 36.2)` | Focus ring (lighter terracotta). |

### Dark Theme (`.dark`)

| Token | OKLCH | Role |
|---|---|---|
| `--background` | `oklch(0.2 0.016 248.7)` | Deep navy-slate. |
| `--foreground` | `oklch(0.965 0.01 91)` | Warm near-white text. |
| `--card` | `oklch(0.255 0.018 247.2)` | Elevated navy surface. |
| `--primary` | `oklch(0.73 0.127 38.6)` | Brighter terracotta (shifts lighter for dark mode contrast). |
| `--primary-foreground` | `oklch(0.205 0.014 248.8)` | Near-black on primary. |
| `--secondary` | `oklch(0.31 0.012 246.2)` | Muted navy. |
| `--muted` | `oklch(0.27 0.012 246.2)` | Muted navy (darker). |
| `--muted-foreground` | `oklch(0.74 0.012 95.1)` | Warm light gray text. |
| `--accent` | `oklch(0.33 0.02 58.3)` | Dim warm accent. |
| `--destructive` | `oklch(0.68 0.18 24.2)` | Brighter red for dark bg contrast. |
| `--border` | `oklch(1 0 0 / 10%)` | White-on-black hairline (10% alpha). |
| `--input` | `oklch(1 0 0 / 14%)` | Slightly stronger input border. |
| `--ring` | `oklch(0.73 0.127 38.6)` | Primary-matching focus ring. |

### Semantic Status Colors

Status hues are **not** theme tokens; they reference Tailwind's built-in palettes with low alpha for softness. From `components/ui/badge.tsx`:

- **Success** — `border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300`
- **Warning** — `border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300`
- **Danger** — `border-rose-500/25 bg-rose-500/12 text-rose-700 dark:text-rose-300`
- **Accent** — `border-primary/20 bg-primary/12 text-primary` (uses theme primary)
- **Neutral** — `border-border/70 bg-card/80 text-foreground`

### Palette Usage Patterns

- **Translucent brand tint**: `bg-primary/12` with `border-primary/20` for pills, highlights, and active nav states.
- **Parchment CTAs**: Full `bg-primary text-primary-foreground` reserved for the highest-intent action on a page (e.g., hero "Active projects" stat card, primary button).
- **Frosted surfaces**: `bg-white/72`, `bg-background/70`, `bg-card/60` with `backdrop-blur` is the canonical "panel on gradient" look — never fully opaque.
- **Gradient backdrops**: The `body` selector paints three stacked layers — top-left primary glow (18%), top-right accent glow (28%), and a white-to-transparent sheen (18% → 0%). The `.page-gradient` utility repeats the pattern at component scope.

---

## Typography

### Font Families

Fonts are loaded via `next/font/google` in `gather/app/layout.tsx`:

```ts
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-sans" })
const fontMono   = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
```

In `globals.css`, `@theme inline` aliases both `--font-sans` and `--font-heading` to the same Montserrat variable:

```css
--font-heading: var(--font-sans);
--font-sans: var(--font-sans);
```

**Implication**: headings and body share Montserrat; differentiation is carried entirely by **weight, size, tracking, and case**. Geist Mono is wired up but used sparingly (reserve for monospace UI like tokens, IDs, code).

### Type Scale

Sizes observed across the app, ordered by role:

| Role | Classes | Example |
|---|---|---|
| Hero headline | `text-5xl font-semibold leading-tight text-balance sm:text-6xl` | Landing hero (`app/page.tsx`) |
| Page title (H1) | `text-4xl font-semibold` (occasionally `text-balance`) | `/app`, `/app/projects`, `/app/projects/new`, `/sign-in` |
| Card title XL (stat) | `text-4xl` or `text-5xl` on `CardTitle` | `MetricCard` value, hero stat card |
| Section title (H2) | `text-2xl font-semibold text-balance` | Sidebar title |
| Card title (default) | `text-lg font-semibold tracking-tight text-balance text-foreground` | `components/ui/card.tsx` `CardTitle` |
| Lead paragraph | `text-lg leading-8 text-muted-foreground` | Landing hero subcopy |
| Body (large) | `text-base leading-7 text-muted-foreground` | Page intros |
| Body (default) | `text-sm leading-6 text-muted-foreground` | Card content, list items |
| Label / UI | `text-sm font-medium` | Form labels, nav items |
| Micro / eyebrow | `text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground` | `.eyebrow` utility |
| Badge | `text-[11px] font-semibold uppercase tracking-[0.24em]` | `components/ui/badge.tsx` |

### Weight Conventions

- `font-semibold` (600) — **every heading and title**. There is no `font-bold` in the codebase.
- `font-medium` (500) — form labels, nav item labels, emphasis inside muted paragraphs, button text (via CVA default).
- Default (400) — all long-form body copy.

### Tracking & Casing

Tracking is a **primary hierarchy tool** — tighter on titles, aggressively loose on uppercase micro-labels.

- `tracking-tight` — default card titles.
- `tracking-[0.24em]` — badges, uppercase descriptors inside cards (e.g., "OBJECTIVE" label in the interview shell).
- `tracking-[0.3em]` — the `.eyebrow` utility, reserved for over-titles above a real heading.

Uppercase is **always** paired with heavy tracking; never use `uppercase` without widening letter-spacing.

### Leading & Balance

- `leading-6` on all `text-sm` body copy.
- `leading-7` on `text-base` body copy.
- `leading-8` on `text-lg` lead paragraphs.
- `text-balance` on every multi-word heading — it is the house style for H1/H2/card titles.

---

## Spacing System

Tailwind's default 4px spacing scale is used throughout. Consistent patterns:

### Vertical Rhythm

- `space-y-2` — tight form-label-to-input spacing.
- `space-y-3` — list items, sub-sections, header content in badges+titles.
- `space-y-4` — default `CardContent` internal spacing (see `card.tsx`).
- `space-y-6` — section padding inside panels, card groups in a column.
- `gap-6` — the canonical grid gap between major sections on a page.
- `gap-10` — hero-level grid (two-column marketing layout).

### Padding

- `px-3 py-1` — badge (combined with `rounded-full`).
- `px-4 py-3` — default `Input` / `Textarea` / nav item.
- `p-4` — small info tiles nested inside cards (`rounded-2xl` children).
- `p-5` — medium info tiles (`rounded-3xl` children).
- `p-6` — `.panel` default padding.

### Page Containers

Every top-level page wraps in:

```tsx
<main className="page-gradient min-h-screen">
  <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    {/* sections */}
  </div>
</main>
```

- `max-w-7xl` — canonical page max width (sign-in uses `max-w-5xl` for an intimate two-card layout).
- Horizontal padding ladder: `px-4` → `sm:px-6` → `lg:px-8`.
- Vertical padding: `py-5`/`py-6`/`py-8` depending on density.

### Grid Patterns

- Two-column hero: `grid gap-10 lg:grid-cols-[1.1fr_0.9fr]` (asymmetric, content-leaning).
- Primary / secondary split: `lg:grid-cols-[1.15fr_0.85fr]` or `[1.2fr_0.8fr]` (note the fractional ratios — avoid plain 50/50 except for form rows).
- Four-up metrics: `grid gap-4 md:grid-cols-2 xl:grid-cols-4`.
- Feature triads: `grid gap-4 lg:grid-cols-3`.

---

## Component Styles

### Button (`components/ui/button.tsx`)

Built with CVA. Base classes define the signature look:

```
rounded-4xl (pill) · border border-transparent · bg-clip-padding · text-sm font-medium ·
transition-all · focus-visible ring-[3px] of ring/50 · active:translate-y-px (tactile press) ·
disabled:opacity-50
```

**Variants**

- `default` — `bg-primary text-primary-foreground hover:bg-primary/80`
- `outline` — `border-border bg-input/30 hover:bg-input/50`
- `secondary` — `bg-secondary text-secondary-foreground hover:bg-secondary/80`
- `ghost` — transparent, `hover:bg-muted`
- `destructive` — `bg-destructive/10 text-destructive hover:bg-destructive/20` (soft destructive — not a solid red fill)
- `link` — inline, `underline-offset-4 hover:underline`

**Sizes**

- `xs` → `h-6 px-2.5 text-xs` (also `icon-xs` = `size-6`)
- `sm` → `h-8 px-3`
- `default` → `h-9 px-3`
- `lg` → `h-10 px-4`
- Icon variants: `icon`, `icon-sm`, `icon-lg` — square sizes matching the height tokens.

Icons are auto-sized: `[&_svg:not([class*='size-'])]:size-4` (3 at `xs`).

### Card (`components/ui/card.tsx`)

`Card` is a thin wrapper that applies the `.panel` class. Structure:

- `Card` → frosted panel.
- `CardHeader` → `space-y-2`.
- `CardTitle` → `text-lg font-semibold tracking-tight text-balance`.
- `CardDescription` → `text-sm leading-6 text-muted-foreground`.
- `CardContent` → `space-y-4`.

### Badge (`components/ui/badge.tsx`)

```
inline-flex items-center rounded-full border px-3 py-1
text-[11px] font-semibold uppercase tracking-[0.24em]
```

Five variants (`neutral`, `accent`, `success`, `warning`, `danger`) — see palette above. Always include a short uppercase label; often paired with a Phosphor icon (`className="gap-2"` then `<Icon className="size-4" />`).

### Input & Textarea

Identical styling patterns — rounded rectangles with frosted fill and an animated focus halo:

```
w-full rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm
shadow-sm outline-none transition
placeholder:text-muted-foreground
focus:border-primary/50 focus:ring-4 focus:ring-primary/10
dark:bg-card/70
```

Textarea adds `min-h-28`.

Native `<select>` elements re-use the same class string inline (see `projects/new/page.tsx`) — there is no dedicated `Select` component in the UI kit yet.

### Custom Global Components (`globals.css`)

Declared under `@layer components`:

- **`.panel`**
  ```
  rounded-[32px] border border-border/70 bg-white/72 p-6
  shadow-[0_18px_60px_-32px_rgba(23,30,55,0.35)]
  backdrop-blur
  dark:bg-card/82
  ```
  The canonical frosted-glass surface. The 32px radius and custom long shadow are deliberate signatures — don't substitute `rounded-3xl` + `shadow-lg`.

- **`.eyebrow`**
  ```
  text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground
  ```
  Over-titles for grouped content (e.g., "Areas of interest" above a list).

- **`.page-gradient`**
  Layered background: warm white-to-background vertical fade plus a top-left primary glow.

### App Shell (`components/dashboard/app-shell.tsx`)

- Two-column layout, sidebar `lg:w-80`, becomes stacked on mobile.
- Sidebar is itself a `.panel`.
- Nav items: `rounded-2xl border px-4 py-3 text-sm font-medium transition`, with active state `border-primary/20 bg-primary/12 text-primary` plus a 2px primary dot on the right.
- Environment footer: nested rounded card (`rounded-2xl border border-border/70 bg-background/75 p-4`) pinned with `mt-auto`.

---

## Shadows & Elevation

The project uses shadow **sparingly** — elevation comes from translucency + color, not drop shadows.

- **Panel shadow (signature)**: `shadow-[0_18px_60px_-32px_rgba(23,30,55,0.35)]`
  - 18px Y-offset, 60px blur, -32px spread, ~35% opacity navy ink.
  - The negative spread tightens the shadow footprint; it feels like diffused contact light rather than a drop shadow.
- **Input/Textarea**: `shadow-sm` — a single hairline lift.
- **Focus halo**: `focus:ring-4 focus:ring-primary/10` on inputs, `focus-visible:ring-[3px] ring/50` on buttons. Rings are the primary "elevation on interaction" signal.

Do **not** use `shadow-md`, `shadow-lg`, or `shadow-xl` — they are absent from the codebase and will break the house register.

---

## Animations & Transitions

- `transition` / `transition-all` / `transition-colors` — applied broadly on interactive surfaces (buttons, nav links, inputs, anchors via the global `a { @apply transition-colors }`).
- `active:not-aria-[haspopup]:translate-y-px` — every button has a 1px press-down except when it's controlling a popover. This is the signature tactility.
- **`tw-animate-css`** is imported in `globals.css` — shadcn-bundled keyframe utilities are available (`animate-in`, `animate-out`, `fade-in`, `slide-in-*`). Use these for panels entering and menu transitions; do not write bespoke `@keyframes`.
- The server-inserted head bootstrap applies the saved or system theme before hydration.
- The local `ThemeProvider` temporarily disables transitions during theme changes to suppress flash.

No bespoke animation durations are defined — rely on Tailwind defaults (`duration-150` implicit).

---

## Border Radius

Radii are generously large — small radii look broken against the 32px panel. Custom radius scale from `@theme inline`:

```
--radius: 1rem (16px) · base
--radius-sm: 0.6rem  (~9.6px)
--radius-md: 0.8rem  (~12.8px)
--radius-lg: 1rem    (16px)
--radius-xl: 1.3rem  (~20.8px)
--radius-2xl: 1.7rem (~27.2px)
```

In practice most components use **Tailwind's arbitrary radius utilities** directly rather than the token scale:

| Utility | Used on |
|---|---|
| `rounded-full` | Badges, primary dot indicators |
| `rounded-4xl` | Buttons (the pill signature) |
| `rounded-3xl` | Large info tiles inside cards |
| `rounded-2xl` | Inputs, textareas, nav items, small nested tiles |
| `rounded-[28px]` | Custom — Objective callout inside interview shell |
| `rounded-[32px]` | `.panel` (the canonical surface) |

Rule of thumb: **the bigger the surface, the bigger the radius.** Panels > tiles > inputs > buttons (pill).

---

## Opacity & Transparency

Opacity is used constantly — it's the single most distinctive tool in this system. Patterns:

### Surface Translucency

- Panels over gradient: `bg-white/72` (light) / `bg-card/82` (dark).
- Nested tile inside a panel: `bg-background/70`, `bg-background/75`, `bg-background/80`.
- "Dashed hint" tiles: `bg-card/60` with `border-dashed`.

### Color Tints (token/N pattern)

Alpha-tinted theme colors for soft highlights:

- `bg-primary/12` + `border-primary/20` — active nav, accent badge, highlight callouts.
- `text-primary-foreground/75`, `text-primary-foreground/80` — secondary text on primary backgrounds.
- `bg-destructive/10`, `bg-destructive/20` — destructive button (soft, not alarming).
- `border-border/70` — default border opacity across the app (full `border-border` is rarely used).

### Border-Translucent Dark Mode

Dark theme borders use alpha on pure white: `oklch(1 0 0 / 10%)`, `oklch(1 0 0 / 14%)` — this is the idiomatic way to get hairline dividers that track the dark background without manual dark: overrides.

### Interactive Opacity

- `hover:bg-primary/80` — primary button hover fades rather than darkens.
- `disabled:opacity-50` — canonical disabled state for buttons.
- `aria-invalid:ring-destructive/20` — 20% destructive ring on invalid fields.

---

## Common Tailwind CSS Usage in Project

### Layout & Structure

- `mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8` — page container (memorize this; it's on every top-level route).
- `min-h-screen` — applied to the outer page-gradient wrapper.
- `flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between` — the canonical "title + CTA" header row.
- `grid gap-4 md:grid-cols-2 xl:grid-cols-4` — metric grids.
- `min-w-0 flex-1` — on `<main>` inside the app shell, to prevent flex overflow.

### Responsive Breakpoints

- `sm:` — 640px (mostly reflow title rows).
- `md:` — 768px (2-column form rows, 2-column metric grids).
- `lg:` — 1024px (**primary** breakpoint for sidebar → content side-by-side, and for asymmetric grid splits).
- `xl:` — 1280px (4-column metric grids).

There is no explicit `2xl:` usage — `max-w-7xl` caps the layout before that point matters.

### Typography

- `text-balance` — applied to virtually every multi-word heading.
- `leading-6` / `leading-7` / `leading-8` — paired tightly with text size.
- `tracking-[0.24em]` / `tracking-[0.3em]` — uppercase micro-labels.
- `truncate` — used on recovery tokens and long IDs in the interview shell.

### Color

- `text-muted-foreground` — default body copy color (not `text-foreground`). Use `text-foreground` only for emphasis, numeric values, and titles.
- `text-primary` — link-like emphasis within muted paragraphs, feature icons.
- `text-primary-foreground/75` — secondary text on a filled-primary card.

### Effects

- `backdrop-blur` — on every panel.
- `border-dashed` — only on "hint" or "status" tiles (interview shell's status card).
- `shrink-0` — sidebar, icons inside buttons.

### Data & ARIA Attribute Selectors

The button component uses advanced selectors that are worth knowing:

- `aria-expanded:bg-muted` — treat pressed-open dropdown triggers as hover-state.
- `aria-invalid:border-destructive aria-invalid:ring-[3px]` — form validation styling without a separate "error" class.
- `has-data-[icon=inline-start]:pl-2.5` — the button tightens padding when it contains a leading icon, via `data-icon="inline-start"` on the child.

### Dark Mode

- Class strategy via the external startup bootstrap: `.dark` on `<html>`, default theme `system`.
- Custom variant: `@custom-variant dark (&:is(.dark *))` — lets us write `dark:bg-card/70` anywhere.
- Rarely needed for text (tokens already swap), but common for surface alphas like `dark:bg-card/82`.

---

## Example Component — Reference Implementation

Below is a reference component that exercises the full system: frosted panel container, eyebrow → H1 → muted lead, badge, primary+outline buttons with icons, info tiles, and status badge.

```tsx
import Link from "next/link"
import { ArrowRight, CheckCircle, Lightning } from "@phosphor-icons/react/dist/ssr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ReferenceSection() {
  return (
    <main className="page-gradient min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero panel */}
        <section className="panel space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge variant="accent" className="gap-2">
                <Lightning className="size-4" />
                Workshop readiness
              </Badge>
              <div>
                <h1 className="text-4xl font-semibold text-balance">
                  Interviews tied to transcript evidence
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  Every synthesized claim traces back to a session segment — no unattributed
                  summaries, no hallucinated themes.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/app">
                  Open workspace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/app/projects">View projects</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Metric triad */}
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription className="uppercase tracking-[0.24em]">
                Completed
              </CardDescription>
              <CardTitle className="mt-3 text-4xl">24</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Transcript-backed interviews ready for synthesis.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription className="uppercase tracking-[0.24em]">
                In progress
              </CardDescription>
              <CardTitle className="mt-3 text-4xl">5</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Active or resumable participant sessions.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardDescription className="text-primary-foreground/75">
                Quality
              </CardDescription>
              <CardTitle className="text-4xl text-primary-foreground">
                92%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-primary-foreground/80">
                Average coverage score across all included sessions.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Nested tile pattern */}
        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardDescription>Emerging theme</CardDescription>
              <CardTitle>Approval bottlenecks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <p className="eyebrow">Supporting evidence</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  "The main bottleneck is that no one knows who can approve exceptions
                  without escalating."
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="success">
                    <CheckCircle className="size-3" />
                    Verified
                  </Badge>
                  <Badge variant="neutral">6 sessions</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Next action</CardDescription>
              <CardTitle>Review flagged sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-between">
                Open session queue
                <ArrowRight className="size-4" />
              </Button>
              <Button variant="secondary" className="w-full justify-between">
                Refresh synthesis
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
```

---

## Patterns & Conventions Checklist

When adding a new screen, verify each of these:

- [ ] Root `<main>` uses `page-gradient min-h-screen`.
- [ ] Inner container is `mx-auto max-w-7xl flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8`.
- [ ] First section of every page is a `.panel` (or a `Card`) containing a `Badge` → H1 → muted lead.
- [ ] Headings use `font-semibold` (never `bold`) + `text-balance`.
- [ ] Body copy defaults to `text-sm leading-6 text-muted-foreground`.
- [ ] Nested tiles inside cards use `rounded-2xl border border-border/70 bg-background/70` (small) or `rounded-3xl … p-5` (medium).
- [ ] Buttons use CVA variants — no raw `<button>` styling.
- [ ] Icons come from `@phosphor-icons/react` (use `/dist/ssr` in server components).
- [ ] Uppercase labels always pair with `tracking-[0.24em]` or `tracking-[0.3em]`.
- [ ] Active/selected states use `bg-primary/12 text-primary` tint — not a solid fill.
- [ ] New theme tokens go in `:root` + `.dark` and are aliased through `@theme inline`.
- [ ] Colors are always OKLCH. Do not introduce hex or HSL.
- [ ] Don't add `shadow-md`/`shadow-lg`. If you need elevation beyond `.panel`, reach for translucency + `backdrop-blur`.

---

## File Reference

| Concern | Path |
|---|---|
| Theme tokens, global layers, custom components | `gather/app/globals.css` |
| Fonts | `gather/app/layout.tsx` |
| Theme startup bootstrap | `gather/components/theme-bootstrap.tsx` |
| Shared theme constants and helpers | `gather/lib/theme/shared.ts` |
| Theme provider + `d` hotkey | `gather/components/theme-provider.tsx` |
| Button variants | `gather/components/ui/button.tsx` |
| Card primitives | `gather/components/ui/card.tsx` |
| Badge variants | `gather/components/ui/badge.tsx` |
| Input / Textarea | `gather/components/ui/input.tsx`, `textarea.tsx` |
| App shell (sidebar layout) | `gather/components/dashboard/app-shell.tsx` |
| Metric card reference | `gather/components/dashboard/metric-card.tsx` |
| Interview shell (rich page example) | `gather/components/participant/interview-shell.tsx` |
| `cn` utility (clsx + tailwind-merge) | `gather/lib/utils.ts` |
| shadcn registry config | `gather/components.json` |
