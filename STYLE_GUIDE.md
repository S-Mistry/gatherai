# Gather Style Guide

## Overview

Gather's interface is a **warm, paper-notebook system** — Instrument Serif body, Caveat handwritten margin notes, Inter Tight sans labels, JetBrains Mono micro-eyebrows. Cream surfaces, ink type, clay accents, sage and gold for status, rose for destructive. Tactile ornaments — masking tape, rubber stamps, pushpins, sticky notes, scribble underlines, hand-drawn arrows — anchor the visual register so the product reads like a consultant's bound notebook, not a SaaS dashboard.

The system is built on:

- **Next.js 16 / React 19** with the `app/` router.
- **Tailwind CSS v4** using the CSS-first configuration (`@theme inline` in `app/globals.css`). There is no `tailwind.config.js` — tokens live as CSS variables and are surfaced to Tailwind via `@theme`.
- **shadcn/ui Slot primitive** for `Button asChild` only. Most other primitives are bespoke and live under `components/ui/`.
- **Phosphor Icons** (`@phosphor-icons/react`) — used sparingly. Hand and serif type does most of the iconographic work.
- **Light mode only.** Dark mode is dropped in v1; the design is a single warm cream palette.

Wordmark is `gather.` — Caveat lowercase with a clay dot. Repository, package names, env vars, and DB names stay `GatherAI` for backward compatibility.

---

## Color Palette

All palette tokens are declared in `gather/app/globals.css` under `:root`, then mapped onto shadcn semantic tokens (`--color-background`, `--color-primary`, etc.) through `@theme inline` so Tailwind utilities like `bg-primary`, `text-muted-foreground`, `border-border` resolve correctly.

### Cream + ink scale

| Token | Value | Role |
|---|---|---|
| `--cream` | `#f5ecd9` | Page background (warm parchment). |
| `--cream-2` | `#ece0c6` | Subtle inset surfaces (split-panel backgrounds, version cards). |
| `--cream-3` | `#e6d8b8` | Reserved for deeper contrast areas. |
| `--card` | `#fffaf0` | Card surface (a touch warmer than background). |
| `--card-2` | `#fdf4e1` | Alternate card surface for variant emphasis. |
| `--ink` | `#2a2319` | Primary type, ink. |
| `--ink-2` | `#5c4e3a` | Secondary type. |
| `--ink-3` | `#8a7a60` | Captions and `.eyebrow`. |
| `--ink-4` | `#b8a37a` | Quiet placeholders, dividers. |
| `--line` | `#c7b896` | Hairline borders. |
| `--line-soft` | `rgba(139,115,80,0.18)` | Even lighter divider on cream. |

### Accent hues (OKLCH)

| Token | OKLCH | Soft pair | Role |
|---|---|---|---|
| `--clay` | `oklch(62% 0.14 40)` | `--clay-soft` | Brand accent. Caveat margin notes, primary CTAs, live indicators, scribble strokes. |
| `--sage` | `oklch(66% 0.08 140)` | `--sage-soft` | Success / approve / feedback pulse / completion. |
| `--rose` | `oklch(60% 0.16 25)` | `--rose-soft` | Destructive, errors, contradictions surfaced for attention. |
| `--gold` | `oklch(72% 0.13 75)` | `--gold-soft` | Stars, warning chips, contradiction "position A" panels. |
| `--stamp` | `oklch(52% 0.17 25)` | — | Rubber-stamp red (used by `.stamp`). |

### Shadows

| Token | Value | Role |
|---|---|---|
| `--shadow-1` | `0 1px 0 rgba(0,0,0,0.03), 0 2px 6px rgba(60,40,20,0.08)` | `card.flat`. |
| `--shadow-2` | `… + 0 12px 40px rgba(60,40,20,0.06)` | Default `.card`. |
| `--shadow-pop` | `… + 0 8px 24px / 0 18px 60px` | `.project-tile:hover`. |

Drop shadows are quiet by design — depth comes from surface tone, not blur.

---

## Typography

### Font Families

Loaded via `next/font/google` in `gather/app/layout.tsx`:

```ts
Instrument_Serif → --font-serif (body + headings, normal & italic)
Caveat           → --font-hand  (handwritten margin notes, eyebrows-with-personality)
Inter_Tight      → --font-sans  (UI labels, button text, chip text, sans body)
JetBrains_Mono   → --font-mono  (eyebrows, timers, tabular figures)
```

In `globals.css`, `@theme inline` aliases `--font-heading: var(--font-serif)`. `html` and `body` default to `var(--font-serif)`.

Use the helper classes in markup:

- `.font-serif` — Instrument Serif (italic supported via inline style).
- `.font-hand` — Caveat. Reserved for clay-coloured margin notes, type-picker flavor labels, form labels, "+ add a question" affordances.
- `.font-sans` — Inter Tight. Buttons, chips, body copy in dense areas.
- `.font-mono` — JetBrains Mono. Eyebrows (`.eyebrow`), timers, IDs, counts.

### Type Scale

| Role | Size / weight / leading | Example |
|---|---|---|
| Hero headline | `64–78px / 400 / 1.02 / -0.018em` (italic-clay accents) | Dashboard greeting, completion stamp |
| H1 | `44–56px / 400 / 1.05 / -0.012em` | New project setup, project list |
| H2 | `26–32px / 400 / 1.12` | Section heads ("In motion", "Themes") |
| H3 / card title | `22–26px / 400 / 1.15–1.2` | Project tile name, theme card title |
| Lead | `18–22px / 1.5 (italic for muted lead)` | Hero subcopy |
| Body sans | `13–14px / 1.55–1.65 / Inter Tight 400/500` | Chip text, descriptions |
| Body serif | `15–17px / 1.5–1.6` | Long-form quotes, evidence excerpts |
| Hand label | `18–32px / Caveat 400` | Form labels, margin notes, type picker flavors |
| Eyebrow | `10–11px / mono / 0.18em / uppercase` | Section eyebrows |
| Stamp | `11px / Inter Tight 700 / 0.28em / uppercase` | "received · 24th voice" |

### Conventions

- **`font-weight: 400`** is the default for headings — Instrument Serif's natural weight is the look. Never reach for `font-weight: 700`; the system has none.
- Use `font-style: italic` + `color: var(--clay)` for the **single accent word** in a headline ("Two ways to listen. *Pick one.*").
- Pair `<Scribble>` with the most important phrase in a question ("what would have made the biggest difference?"). Don't scribble more than one phrase per screen.
- Caveat is a *typographic* element, not decoration. Use it for labels and margin notes — never for body copy.
- Eyebrows always come with `0.18em` letter-spacing minimum. Never set uppercase without tracking.
- `text-balance` on multi-word headings.

---

## Spacing System

The system uses a generous page width (`max-w-[1320px]`) and large vertical rhythm.

### Vertical rhythm

- Sections inside a page: `space-y-14` (~56px) at the page level, `space-y-7` (~28px) within a card.
- Between fields in a form: `gap-7` (~28px). Notebook fields breathe.
- Between list items: `gap-3` to `gap-4`.
- `mt-3` between an eyebrow and its title.

### Padding

- `.app-bar`: `18px 36px`.
- `.card`: `22px 26px` default, `30px 32px` for hero or wide cards.
- `.card.lined.red-line`: `30px 36px 36px 70px` (extra left-padding for the red margin line).
- `.btn`: `11px 20px` default; `7px 14px` (`.sm`); `14px 26px` (`.lg`).
- `.chip`: `5px 11px`.
- Notebook field input: `padding: 10px 2px` (the dashed underline does the visual work).

### Page container

```tsx
<div className="min-h-screen">
  <AppBar … />
  <main className="mx-auto w-full max-w-[1320px] px-6 py-9 sm:px-8 lg:px-10">
    {/* sections */}
  </main>
</div>
```

(`AppShell` already wraps every consultant route — pages add their content inside.)

### Grid patterns

- Synthesis hero: `grid items-stretch gap-8` at `1.25fr / 1fr`.
- BigStat tiles: `grid` at `1fr 1fr` with `gap: 14px`.
- Theme rows: `grid` at `320px / 1fr / 200px / auto` (title / summary / spectrogram / evidence).
- Sticky-note quotes: `grid-cols-12` with each note spanning 3–5 columns and rotated −2° to +2°.
- Contradiction split: `1fr 110px 1fr` (position A / versus axis / position B).
- Type picker: `1fr 1fr` with each card tilted ±0.5°.

---

## Component Primitives

### Wordmark — `components/ui/wordmark.tsx`

```tsx
<Wordmark href="/" />   // Caveat lowercase + clay dot. Renders inside <AppBar>.
```

### App bar — `components/ui/app-bar.tsx`

```tsx
<AppBar
  crumb={[{ label: "Workspace", href: "/app" }, { label: detail.project.name }]}
  right={<Button variant="clay" size="sm">+ New project</Button>}
  avatar={<AppBarAvatar initials="EJ" />}
/>
```

The bar uses a sticky cream background, a dashed bottom border, and the wordmark on the left. Each consultant route flows beneath it; participant routes also use it (with a `chip` on the right rather than an avatar).

### Crumb — `components/ui/crumb.tsx`

Inter Tight breadcrumb with `/` separators — sits inside the AppBar.

### Card — `components/ui/card.tsx`

```tsx
<Card flat>           // .card.flat — single hairline lift
<Card lined redLine>  // ruled paper + red margin line (notebook setup form)
<Card>                // default warm card with shadow-2
```

`CardTitle` is Instrument Serif `text-2xl font-normal`; `CardDescription` is Inter Tight 13px on `--ink-2`.

### Button — `components/ui/button.tsx`

```tsx
<Button>                       // ink fill (default)
<Button variant="clay">        // clay fill — reserved for primary CTAs
<Button variant="sage">        // sage fill — feedback / approve actions
<Button variant="ghost">       // 1.5px ink outline, no shadow
<Button variant="link">        // inline text link
<Button variant="destructive"> // ghost outline tinted rose
```

Sizes: `sm / default / lg`. Button wraps the `.btn` system class — every visual is in CSS, not utilities, so changing the look means editing `globals.css`.

### Badge / Chip — `components/ui/badge.tsx`

```tsx
<Badge variant="clay">live</Badge>
<Badge variant="sage" dot>collecting</Badge>
<Badge variant="gold">scheduling</Badge>
<Badge variant="rose">excluded</Badge>
<Badge variant="solid">workshop ready</Badge>
```

Variants `accent` / `success` / `warning` / `danger` are kept as **legacy aliases** mapping to `clay` / `sage` / `gold` / `rose` — old callsites continue to work.

### Field + Input + Textarea

```tsx
<Field label="project name" htmlFor="name">
  <Input id="name" name="name" required />
</Field>
```

Inputs and textareas are **notebook fields**: transparent background, dashed bottom border that goes solid clay on focus. Caveat clay label sits above. Size scales — `font-serif text-xl` is the default; this is meant to feel like writing in a journal.

### Ornaments — `components/ui/ornaments.tsx`

| Component | Purpose |
|---|---|
| `<Tape tint="yellow|green|rose">` | Masking-tape strip across the top of a paper card. |
| `<Stamp variant="stamp|sage|ink">` | Tilted rubber-stamp pill. Use for "workshop ready", "received · Nth voice". One stamp per page max. |
| `<Pin tint="clay|sage|gold|stamp">` | Pushpin dot at the top of a note. |
| `<Scribble>` | Hand-drawn underline (clay SVG) — wrap the most important phrase. |
| `<WaveBars count={20} height={36}>` | Animated audio wave — interview live state, recording timer. |
| `<MicRing active onClick>` | The big clay record button (feedback / testimonial flow). |
| `<Spectrogram frequency={6} total={7}>` | Theme frequency bars on synthesis. |
| `<StickyNote tint="cream|peach|sage|lilac" rotate={-2}>` | Quote sticky note with paper shadow. |

### Evidence drawer — `components/ui/evidence-drawer.tsx`

A right-side drawer with a dashed-divider header. Use for any "open the evidence behind this claim" moment. Closes on Escape, click-backdrop, or the close button. Inside the drawer use `font-serif` for quoted text, `font-hand` for the speaker tag, `eyebrow` for the section label.

The synthesis page's themes / quotes / contradictions all open this drawer through `ProjectEvidenceSurface` (which manages the loading state and cache).

---

## Page Patterns

### Dashboard (`/app`)

Caveat greeting (`good morning, ellen —`) → italic-clay accent headline counting projects → two sections:

- **In motion** (2-col `<ProjectTile>` grid for live or synthesizing projects).
- **Quiet for now** (3-col grid; last cell is a dashed `+ start a new one` tile).

`<ProjectTile>` shows a hand-flavor tag (`☞ stakeholder interviews`, `✶ feedback pulse`, `☉ testimonial collection`), the project name in serif, progress as either a dot row (stakeholder) or filled bar (feedback / testimonial), a status chip and a relative-time stamp.

### New project (`/app/projects/new`)

Two-step flow without a route change. Step 1 is the **TypePicker**: two paper cards tilted ±0.5° with rotated tape, Caveat flavor labels, serif title, sans description, and three chips below. Step 2 is the **SetupForm** — a `card lined red-line` (ruled paper) with notebook fields. Numbered questions use Caveat clay numerals.

### Project detail / synthesis (`/app/projects/[id]`)

Hero card with `Tape`, `what we heard —` Caveat eyebrow, italic-clay project name, an executive narrative, and a `<Stamp>workshop ready</Stamp>` when ≥3 sessions are included. To the right, a 2×2 grid of `BigStat` tiles (interviews / themes / contradictions / quality).

Below: `ProjectEvidenceSurface` renders **Themes** as spectrogram rows, **In their words** as a 12-col sticky-note constellation, and **Where they disagree** as gold/sage split panels with a `VersusAxis`. Each item opens the evidence drawer.

Bottom of the page: collection setup, version history, optional consultant override, and a quality warning banner if synthesis is moderate-confidence.

### Stakeholder interview (`/i/[linkToken]`)

`AppBar` with a clay `recording transcript only` chip. Hero card with greeting + objective. Right rail with three `card flat`s: project context, today's questions checklist (sage/clay rings), anonymity disclaimer. The notebook layout is single-column for the conversation; the right-side waveform was deliberately removed in the design — never reintroduce it.

Live state uses inline `<WaveBars>` plus an italic Caveat status. Controls below: clay `End conversation`, ghost `Pause`, ghost `Ask again`. Caveat elapsed/remaining on the right.

### Feedback / testimonial (`/t/[linkToken]`)

Single screen: `AppBar` with sage `words only · we don't keep audio` chip; centered card with green tape and a `<Scribble>` on the question; centered `<MicRing>`; `<WaveBars>` + Caveat italic timer below. Sage `Submit` and ghost `Start over` CTAs. **No live transcript shown to the participant** — they speak, we listen, they see the editable transcript only after stopping.

### Completion / thank-you

Sage `<Stamp>received · thank you</Stamp>`, big serif headline, Caveat `— really.` accent, body, optional sage sticky-note explaining what happens next.

### Embed (`/embed/testimonials/[projectId]`)

Cream background, mono `In their words` eyebrow, italic brand-color business name in the headline. Approved reviews render as `.sticky` notes with rotation, gold star row, serif quote, mono name. "Powered by gather." footer link.

---

## Animations & Motion

- **Bar breathe**: `bar-breathe 1.1s ease-in-out infinite` — the wave bars scale between 8px and 48px while opacity 0.5 → 1.
- **Mic pulse + ripple**: `mic-pulse 2.4s` + `mic-ripple 2.4s` (with a 1.2s delay on the second ripple) — the big record ring breathes and emits two soft rings.
- **Live pulse**: `live-pulse 1.6s` — the live-now dot on a project tile.
- **Drawer slide**: `slide-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)` + `fade-in 0.2s` on backdrop.
- **Project tile hover**: `transform translateY(-2px)` + shadow-pop transition over 150ms.
- **Button hover**: `transform translateY(-1px)` + an extra 1px of ink shadow.

`tw-animate-css` is imported but only used in passing — most animations live in `globals.css` keyframes.

---

## Border Radius

The system uses **smaller radii than typical SaaS** — paper edges, not pebbles.

| Utility | Used on |
|---|---|
| `rounded-full` | Buttons, chips, pills, dots, mic ring, avatar |
| `rounded-md` (~6px) | `.card` (the canonical paper surface) |
| `rounded-[8px]` | `.project-tile`, contradiction position panels, embed reviews |
| `rounded-[3px]` | `.stamp`, `.sticky` |

Don't use `rounded-3xl`/`rounded-4xl`/`rounded-[28px]` — they break the paper register. Dashed borders (`border-dashed` / `divider-dashed`) are the system's preferred soft separator.

---

## Patterns Checklist

When adding a new screen, verify each of these:

- [ ] Page wraps in `<AppBar>` + `<main className="mx-auto w-full max-w-[1320px] px-6 py-9 sm:px-8 lg:px-10">`.
- [ ] First section opens with a Caveat eyebrow → serif headline → optional muted lead.
- [ ] Headings use `font-weight: 400`. There is no `font-bold`.
- [ ] Body text defaults to `var(--ink-2)` (use `text-[var(--ink-2)]` on Tailwind classes that don't pick it up).
- [ ] Forms wrap each input in `<Field label="…">`. Inputs use the notebook style (`<Input>`/`<Textarea>` primitives).
- [ ] Buttons use the `<Button>` CVA variants — never raw `<button>` styling for primary actions.
- [ ] One `<Stamp>` per page max. One `<Tape>` per card. One `<Scribble>` per heading.
- [ ] Active / live states use `clay` (interviews) or `sage` (feedback / testimonial). Never both on the same surface.
- [ ] No `dark:` classes — the system is light-only.
- [ ] No `panel`/`panel-flush` classes — those are legacy. Use `card` / `card flat` / `card lined red-line`.
- [ ] Colors via the named CSS vars (`var(--clay)`, etc.) or shadcn aliases (`bg-primary`, `text-muted-foreground`). Never raw hex/HSL except inside `:root`.

---

## File Reference

| Concern | Path |
|---|---|
| Theme tokens, global layers, custom components | `gather/app/globals.css` |
| Fonts | `gather/app/layout.tsx` |
| Wordmark | `gather/components/ui/wordmark.tsx` |
| App bar + avatar | `gather/components/ui/app-bar.tsx` |
| Breadcrumb | `gather/components/ui/crumb.tsx` |
| Field wrapper | `gather/components/ui/field.tsx` |
| Ornaments (tape/stamp/pin/scribble/wave/mic/spectro/sticky) | `gather/components/ui/ornaments.tsx` |
| Evidence drawer shell | `gather/components/ui/evidence-drawer.tsx` |
| Button | `gather/components/ui/button.tsx` |
| Card | `gather/components/ui/card.tsx` |
| Badge | `gather/components/ui/badge.tsx` |
| Input / Textarea | `gather/components/ui/input.tsx`, `textarea.tsx` |
| Project tile | `gather/components/dashboard/project-tile.tsx` |
| App shell (top chrome wrapper) | `gather/components/dashboard/app-shell.tsx` |
| Synthesis evidence surface | `gather/components/dashboard/project-evidence-surface.tsx` |
| Interview surfaces | `gather/components/participant/interview-shell-surfaces.tsx` |
| Testimonial capture shell | `gather/components/testimonials/testimonial-capture-shell.tsx` |
| `cn` utility | `gather/lib/utils.ts` |
