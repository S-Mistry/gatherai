# Gather Style Guide

> **The single source of truth for the Gather visual system.**
> If you can't find a rule here, check `gather/project/final/` (the canonical design archive). Anything in this doc must match that source within ±2px on type and exact-match on copy, ornament positions, grid templates, and animations. When the design and this doc disagree, the design wins and this doc must be updated.

The goal of this guide is for an agent reading it cold to recreate any Gather page pixel-perfect without seeing the original mockup. Be precise; don't approximate.

---

## 0. The system at a glance

- **Register**: warm, paper-notebook. A consultant's bound journal, not a SaaS dashboard.
- **Light mode only.** No `.dark` block, no `dark:` Tailwind variants, no theme toggles.
- **Typeface stack**: Instrument Serif (body + headings), Caveat (handwritten margin notes, form labels, eyebrow flavors), Inter Tight (sans labels, button text, chip text), JetBrains Mono (eyebrows, timers, IDs).
- **Wordmark**: `gather.` — Caveat lowercase + clay-coloured period. Repository, package, env var, and database identifiers stay `GatherAI`; only the *visible* wordmark changes.
- **Tactile ornaments are first-class**: `Tape`, `Stamp`, `Pin`, `Scribble`, `WaveBars`, `MicRing`, `Spectrogram`, `StickyNote`, `MarginNote`. They live alongside primitives, not in a "decorations" sub-folder.
- **The italic-clay one-word accent inside a serif headline is the signature move** — used once per hero (e.g. *"Two ways to listen. **Pick one.**"*).
- **Page padding lives in pages, not the app shell.** `<AppShell>` renders only the sticky `<AppBar>`; each page sets its own outer container.

---

## 1. Tokens (verbatim)

These declarations live in `gather/app/globals.css` under `:root` and must be reproduced exactly. They are referenced everywhere as CSS variables; never hard-code a colour or shadow.

```css
:root {
  /* Cream + ink scale */
  --cream:   #f5ecd9;   /* page background — warm parchment */
  --cream-2: #ece0c6;   /* subtle inset surfaces (split panels, version cards) */
  --cream-3: #e6d8b8;   /* deeper contrast areas */
  --card:    #fffaf0;   /* default card surface (warmer than background) */
  --card-2:  #fdf4e1;   /* alternate card surface */
  --ink:     #2a2319;   /* primary text */
  --ink-2:   #5c4e3a;   /* secondary text */
  --ink-3:   #8a7a60;   /* captions, eyebrows, hover-text */
  --ink-4:   #b8a37a;   /* placeholders, deep-dim text */
  --line:      #c7b896;            /* hairline borders */
  --line-soft: rgba(139,115,80,0.18);

  /* Accents (OKLCH) */
  --clay:      oklch(62% 0.14 40);
  --clay-soft: oklch(62% 0.14 40 / 0.12);
  --sage:      oklch(66% 0.08 140);
  --sage-soft: oklch(66% 0.08 140 / 0.15);
  --rose:      oklch(60% 0.16 25);
  --rose-soft: oklch(60% 0.16 25 / 0.12);
  --gold:      oklch(72% 0.13 75);
  --gold-soft: oklch(72% 0.13 75 / 0.18);
  --stamp:     oklch(52% 0.17 25);

  /* Shadows */
  --shadow-1:    0 1px 0 rgba(0,0,0,0.03), 0 2px 6px rgba(60,40,20,0.08);
  --shadow-2:    0 1px 0 rgba(0,0,0,0.03), 0 2px 6px rgba(60,40,20,0.08),
                 0 12px 40px rgba(60,40,20,0.06);
  --shadow-pop:  0 2px 0 rgba(0,0,0,0.04), 0 8px 24px rgba(60,40,20,0.10),
                 0 18px 60px rgba(60,40,20,0.06);

  --radius: 6px;
}
```

| Token | Role |
|---|---|
| `--cream` | Page background. `body { background }`. |
| `--cream-2` | Inset surfaces — anonymity disclaimer card, alternate forms, contradiction split bar track. |
| `--card` | Default `.card` surface. |
| `--card-2` | Used on `feedback` / testimonial setup cards and on the anonymity rail. |
| `--ink` | Body text, primary CTAs (default Button), wordmark base. |
| `--ink-2` | Lead paragraphs, body sans, paused/pre-start status. |
| `--ink-3` | `.eyebrow`, captions, mono dates, ghost-button rest text. |
| `--ink-4` | Placeholder dashes (e.g. `done<ink-4>/total`), unfilled progress dots. |
| `--line` | All hairline borders (1.5px dashed for empty tiles, 1px solid for cards). |
| `--line-soft` | Even softer divider, used on session-tile borders. |
| `--clay` | Brand accent — Caveat margin notes, primary CTAs, the live indicator, scribble strokes, italic accent text. |
| `--sage` | Success / approve / `feedback pulse` flavor / completion stamp. |
| `--rose` | Destructive, errors, contradictions surfaced for attention, low-quality flags. |
| `--gold` | Star ratings, warning chips, contradiction "position A" panels. |
| `--stamp` | Rubber-stamp red — used by `.stamp` default. |
| `--shadow-1` | `card.flat` (single hairline lift). |
| `--shadow-2` | Default `.card`. |
| `--shadow-pop` | `project-tile:hover`, popovers, dialogs. |

There is **no `.dark` block**. Removing dark mode is locked in `docs/decision-log.md` D-019.

---

## 2. Theme aliases

Map cream/clay tokens onto shadcn's semantic tokens through `@theme inline`. This keeps `bg-primary`, `text-muted-foreground`, `border-border`, etc. cascading correctly on third-party UI without rewriting every `cn()` call.

```css
@theme inline {
  --color-background:        var(--cream);
  --color-foreground:        var(--ink);
  --color-card:              var(--card);
  --color-card-foreground:   var(--ink);
  --color-popover:           var(--card);
  --color-popover-foreground:var(--ink);
  --color-primary:           var(--clay);
  --color-primary-foreground:var(--card);
  --color-secondary:         var(--cream-2);
  --color-secondary-foreground:var(--ink);
  --color-muted:             var(--cream-2);
  --color-muted-foreground:  var(--ink-2);
  --color-accent:            var(--gold);
  --color-accent-foreground: var(--ink);
  --color-destructive:       var(--rose);
  --color-border:            var(--line);
  --color-input:             var(--line);
  --color-ring:              var(--clay);

  --font-serif:   var(--font-serif);
  --font-hand:    var(--font-hand);
  --font-sans:    var(--font-sans);
  --font-mono:    var(--font-mono);
  --font-heading: var(--font-serif);

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 18px;
}
```

---

## 3. Fonts

Loaded via `next/font/google` in `gather/app/layout.tsx`:

```ts
Instrument_Serif({ subsets: ["latin"], weight: ["400"], style: ["normal", "italic"], variable: "--font-serif" })
Caveat           ({ subsets: ["latin"], weight: ["400", "600", "700"],                variable: "--font-hand"  })
Inter_Tight      ({ subsets: ["latin"], weight: ["400", "500", "600", "700"],         variable: "--font-sans"  })
JetBrains_Mono   ({ subsets: ["latin"], weight: ["400", "500"],                       variable: "--font-mono"  })
```

For one-shot mockups outside the Next.js app, use this Google Fonts link tag verbatim:

```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Caveat:wght@400;600;700&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Apply families through these utility classes (defined in `globals.css`):

| Class | Family |
|---|---|
| `.font-serif` | Instrument Serif. Default for body, headings. |
| `.font-hand` | Caveat. Margin notes, form labels, eyebrow flavors. |
| `.font-sans` | Inter Tight. Buttons, chips, dense body, descriptive subcopy. |
| `.font-mono` | JetBrains Mono. Eyebrows, timers, counts, IDs. |

The `<html>` and `<body>` default to `--font-serif`. `font-weight: 400` is the default for Instrument Serif headings — never use `font-bold` anywhere.

---

## 4. Type scale

Every font-size used in the system, with the surface(s) where it appears. **Match these values exactly.**

| Role | Size / weight / line-height / tracking | Surfaces |
|---|---|---|
| **Hero — Completion** | 78 / 400 / 1.0 / -0.02em | Completion screen H1 |
| **Hero — Dashboard** | 64 / 400 / 1.02 / -0.015em | `/app` greeting headline; landing hero |
| **Hero — Synthesis** | 60 / 400 / 1.05 / -0.018em | Synthesis "what we heard" H1 |
| **TypePicker** | 56 / 400 / 1.05 / -0.015em | New project type picker H1 |
| **H1 page-level** | 44–48 / 400 / -0.01em | Sign-in, StakeholderSetup, FeedbackSetup, Projects list |
| **FeedbackInterview Q** | 38 / 400 / 1.18 / -0.005em | Feedback interview question (scribble-wrapped) |
| **DeepInterview Q** | 34 / 400 / 1.15 | Inside notebook card (scribble-wrapped) |
| **H2 section** | 32 / 400 | Synthesis section heads inside `.section-head` |
| **Caveat — Completion accent** | 30 / 400 / clay / rotate(-1deg) | "— really." |
| **Caveat — TypePicker flavor** | 30 / 400 | "☞ stakeholder interviews" / "✶ feedback pulse" |
| **TypePicker card title** | 30 / 400 / 1.2 | h3 inside type-picker card |
| **Caveat — Dashboard greeting** | 28 / 400 / clay | "good morning, ellen —" |
| **Caveat — DeepInterview greeting** | 28 / 400 / clay / rotate(-1.5deg) | "conversation with stakeholder b —" |
| **Caveat — Empty tile** | 32 / 400 / clay | "+ start a new one" |
| **Caveat — Notebook controls** | 22 / 400 / ink-3 | "{elapsed} elapsed · {cap} cap" |
| **Caveat — Section helper** | 20 / 400 / ink-3 | "— need a look", "— pulled from every transcript", etc. |
| **Caveat — Sidebar headers** | 24 / 400 / clay | "hello —", "today's questions" |
| **Caveat — Form label** | 22 / 400 / clay (or sage on feedback) | `.field label` |
| **Caveat — Numbered question** | 24 / 400 / clay | "1." "2." in StakeholderSetup |
| **Caveat — "+ add a question"** | 22 / 400 / clay | StakeholderSetup affordance |
| **Caveat — Skip link** | 18 / 400 / ink-3 | FeedbackInterview footer |
| **Caveat — Type-page tip** | 20 / 400 / ink-3 | StakeholderSetup trailing hint |
| **Caveat — Margin note** | 22 / 400 / clay / lh 1.3 | DeepInterview margin annotation |
| **Caveat — TypePicker eyebrow** | 24 / 400 / clay | "what kind of conversation —" |
| **Caveat — Sticky-note quote ≤120ch** | 26 / 400 / ink / lh 1.25 | Synthesis quote constellation |
| **Caveat — Sticky-note quote >120ch** | 22 / 400 / ink / lh 1.25 | Synthesis quote constellation (long) |
| **Caveat — Sticky-note copy** | 20 / 400 / ink / lh 1.3 | Completion sticky note |
| **Caveat — Transcript speaker tag** | 20 / 400 / clay or ink-3 / rotate(±2°) | DeepInterview transcript rows |
| **Caveat — VersusAxis label** | 22 / 400 / clay | Synthesis contradiction "{a} ↔ {b}" |
| **Card title H3** | 26 / 400 / 1.15 / -0.005em | ProjectTile name |
| **Card title (right rail)** | 24 / 400 / 1.18 | Sidebar project context, anonymity card title |
| **Lead paragraph (synthesis)** | 22 / serif / 1.5 / ink-2 | Completion body |
| **Lead paragraph (notebook)** | 21 / serif / 1.5 | DeepInterview transcript text |
| **Body sans (default)** | 14 / Inter Tight / 1.55–1.6 / ink-2 | Card descriptions, lead body |
| **Body sans (dense)** | 13 / Inter Tight / 1.55 / ink-2 or ink-3 | Tile taglines, helper text |
| **Body serif (drawer + sticky inner)** | 16–17 / 1.5 | Evidence drawer quotes |
| **Italic feedback status** | 26 / serif / italic / ink-2 | "recording · MM:SS" / "tap to resume" |
| **Italic narrative emphasis** | inherit / italic / clay | Synthesis hero phrase ("exception decisions have no clear owner") |
| **Eyebrow** | 10 / mono / 0.18em / uppercase / ink-3 | `.eyebrow` (BigStat label, drawer header, "POSITION A/B", "Pipeline") |
| **Stamp** | 11 / Inter Tight / 700 / 0.28em / uppercase / rotate(-3deg) / opacity 0.82 | "Synthesis ready", "received · {n}th voice" |
| **Mono date / count / quality** | 9.5–11 / mono / ink-3 (or ink-2 for highlights) | Project tile timestamp, session quality, theme frequency, contradiction voice counts |

### Rules

- **Italic-clay one-word accent**: a serif headline gets one italic clay word at most — no more, no less. Apply to "**two**" in "Four projects, **two** waiting on you.", "**Pick** one.", "**One** unresolved decision.", "**Without**" in "Better interviews. *Without* you running every one.".
- **`text-balance`** is the default on multi-word headings (`<h1>` and `<h2>`) — the `final.css` does not set this explicitly because Instrument Serif at 400 already breaks naturally; we add it in Tailwind via `text-balance` class where helpful.
- **Caveat is type, not decoration.** Use it for labels and notes. Never for body copy.
- **Uppercase always pairs with letter-spacing.** Eyebrows are `0.18em`, stamps `0.28em`, badges `0.14em–0.16em`. Never set `uppercase` without tracking.

---

## 5. Animations

| Keyframe | Duration / easing | Applied to | Trigger |
|---|---|---|---|
| `bar-breathe` | 1.1s ease-in-out infinite | `.wave-bars .bar` | Always while WaveBars is mounted. Each bar takes a per-index delay (deterministic in code: `((index*37) % 23) / 20` to avoid hydration mismatch; design uses `Math.random() * 1.1`). |
| `mic-pulse` | 2.4s ease-in-out infinite | `.mic-ring` | Always while mounted. Toggle paused via `animationPlayState`. |
| `mic-ripple` | 2.4s ease-out infinite (delay 0s and 1.2s) | `.mic-ring::before` and `.mic-ring::after` | Always while mounted. |
| `live-pulse` | 1.6s ease-in-out infinite | `.project-tile.live::after` | Project tile when `live` (in-progress or synthesizing). |
| `slide-in` | 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) | `.drawer` | Drawer mount. |
| `fade-in` | 0.2s ease | `.drawer-backdrop`, dialog overlays | Drawer/dialog mount. |
| Button hover | `transform: translateY(-1px); box-shadow: 0 3px 0 rgba(0,0,0,0.15)` | `.btn:hover` | Hover. |
| Project tile hover | `transform: translateY(-2px); box-shadow: var(--shadow-pop)` | `.project-tile:hover` | Hover. |

---

## 6. Layout primitives

### 6.1 The chrome

**Every consultant page renders its own `<ConsultantAppBar>` at the top.** The consultant layout (`app/app/layout.tsx`) only provides the auth gate and `<ConsultantSessionProvider>` — it does not paint any chrome. There is no global `<AppShell>` wrapper anymore.

```tsx
// app/app/layout.tsx
return (
  <ConsultantSessionProvider value={{ userEmail, demoMode: false }}>
    <div className="flex min-h-screen flex-col">{children}</div>
  </ConsultantSessionProvider>
)

// each consultant page renders its own bar
<>
  <ConsultantAppBar
    crumb={[
      { label: "Workspace", href: "/app" },
      { label: project.name, href: `/app/projects/${project.id}` },
      { label: respondent.label },
    ]}
    rightSlot={<ReviewStatusControls … />}
  />
  <div style={{ padding: "32px 40px 80px", maxWidth: 1320, margin: "0 auto" }}>
    {/* page content */}
  </div>
</>
```

`<ConsultantAppBar>` (`components/dashboard/consultant-app-bar.tsx`) reads `userEmail` and `demoMode` from `useConsultantSession()`, then renders `<AppBar>` with the avatar + Sign-out form preassembled into the right slot.

`<AppBar>` (`components/ui/app-bar.tsx`) is sticky, dashed-bottom, min-height `var(--app-bar-height)` (`74px`), padding `18px 36px`. Renders the wordmark on the left, optional `<Crumb>` next to it, optional right slot, and an optional avatar. The left group must be `min-width: 0; flex: 1`; the right group must not shrink; breadcrumbs truncate instead of overlapping the right controls.

**Breadcrumbs deepen with route depth.** Status pills and overflow menus go into the AppBar `rightSlot` — never into a second sticky row.

| Route | Crumb | Right slot |
|---|---|---|
| `/app` | `[{Workspace}]` | (none) |
| `/app/projects` | `[{Workspace, /app}, {Projects}]` | (none) |
| `/app/projects/new` | `[{Workspace, /app}, {New project}]` | (none) |
| `/app/projects/{id}` (synthesis) | `[{Workspace, /app}, {project.name}]` | `<chip>refreshed N min ago</chip>` (when applicable) |
| `/app/projects/{id}/sessions/{id}` | `[{Workspace, /app}, {project.name, /app/projects/{id}}, {respondent.label}]` | `<ReviewStatusControls>` (status popover + transcript toggle + overflow menu) |
| `/i/{linkToken}` (deep interview) | `[{project.name}, {respondent · live}]` | clay chip `recording transcript only` |
| `/t/{linkToken}` (feedback) | `[{businessName} feedback]` | sage chip `words only · we don't keep audio` |

```css
.app-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  min-height: var(--app-bar-height);
  padding: 18px 36px;
  border-bottom: 1px dashed var(--line);
  background: var(--cream);
  position: sticky;
  top: 0;
  z-index: 50;
}
```

Secondary sticky bars inside authenticated pages use `top: var(--app-bar-height)`. Do not use fixed Tailwind offsets like `top-14` for app-underlay bars.

### 6.2 Page recipes (skeletons)

Every page below is the canonical layout. Reproduce paddings, max-widths, and grid templates exactly.

#### Dashboard (`/app`)

```
<>
  <section style={{ padding: '48px 36px 28px', maxWidth: 1680, margin: '0 auto' }}>
    {/* Caveat 28 clay greeting + serif 64 hero + flex-baseline subhead (sans 14 ink-2 with bold project name + mono 11 ink-3 date) */}
  </section>

  <section style={{ padding: '0 36px 32px', maxWidth: 1680, margin: '0 auto' }}>
    <div className="section-head">
      <h2 className="font-serif" style={{ fontSize: 26, fontWeight: 400 }}>In motion</h2>
      <span className="font-hand" style={{ fontSize: 18, color: 'var(--ink-3)' }}>— need a look</span>
    </div>
    <div className="workspace-dashboard-grid">
      {/* <ProjectTile /> ×N */}
    </div>
  </section>

  <section style={{ padding: '20px 36px 80px', maxWidth: 1680, margin: '0 auto' }}>
    <div className="section-head">
      <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 400, color: 'var(--ink-2)' }}>Quiet for now</h2>
    </div>
    <div className="workspace-dashboard-grid">
      {/* dashed empty tile first + <ProjectTile /> ×N */}
    </div>
  </section>
</>
```

Dashboard grids use `.workspace-dashboard-grid`: `--workspace-dashboard-tile-width: 274px; --workspace-dashboard-tile-height: 208px; --workspace-dashboard-gap: 18px; display: grid; gridTemplateColumns: repeat(4, var(--workspace-dashboard-tile-width)); gridAutoRows: var(--workspace-dashboard-tile-height); gap: var(--workspace-dashboard-gap); alignItems: stretch; justifyContent: center`. Direct children get `width: var(--workspace-dashboard-tile-width); minWidth: 0; height: var(--workspace-dashboard-tile-height)`. At `max-width: 1220px`, use two fixed columns; at `max-width: 700px`, use one centered `min(100%, 274px)` column. Project tiles and the empty start tile fill the full grid row.

Empty tile first cell: `width: var(--workspace-dashboard-tile-width); height: var(--workspace-dashboard-tile-height); border: 1.5px dashed var(--line); border-radius: 8; padding: 24px 26px; display: grid; place-items: center; color: var(--ink-3); overflow: hidden` with Caveat 32 clay `+ start a new one` and sans 12 ink-3 `stakeholder interviews · feedback pulse`.

#### New project (`/app/projects/new`) — TypePicker

```
<div className="mx-auto w-full max-w-[980px]">
  <div className="font-hand" style={{ fontSize: 24, color: 'var(--clay)' }}>what kind of conversation —</div>
  <h1 className="font-serif" style={{ fontSize: 56, fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.015em', margin: '0 0 40px' }}>
    Two ways to listen. <span style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>Pick one.</span>
  </h1>

  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
    <button style={{ transform: 'rotate(-0.5deg)' }}>
      <div className="card flat" style={{ padding: '28px 30px 26px', minHeight: 280 }}>
        <Tape style={{ top: -11, left: 32, transform: 'rotate(-3deg)' }} />
        <div className="font-hand" style={{ fontSize: 30, color: 'var(--clay)' }}>☞ stakeholder interviews</div>
        <h3 className="font-serif" style={{ fontSize: 30, fontWeight: 400, lineHeight: 1.2, margin: '14px 0 18px' }}>{preset.createTitle}</h3>
        <p className="font-sans" style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>{preset.description}</p>
        <div className="mt-6 flex flex-wrap gap-[10px]">
          <span className="chip">Up to 12 sessions</span>
          <span className="chip">Live transcript</span>
          <span className="chip">Cross-interview synthesis</span>
        </div>
      </div>
    </button>

    <button style={{ transform: 'rotate(0.5deg)' }}>
      <div className="card flat" style={{ padding: '28px 30px 26px', minHeight: 280, background: 'var(--card-2)' }}>
        <Tape tint="green" style={{ top: -11, right: 32, transform: 'rotate(3deg)' }} />
        <div className="font-hand" style={{ fontSize: 30, color: 'var(--sage)' }}>✶ feedback pulse</div>
        <h3 className="font-serif" style={{ fontSize: 30, fontWeight: 400, lineHeight: 1.2, margin: '14px 0 18px' }}>Questions, sent wide. Answers in under two minutes each.</h3>
        <p className="font-sans" style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>For everyone after a launch, retro, or change. No live transcript shown to the participant — just record, thank, and roll into themes when enough have answered.</p>
        <div className="mt-6 flex flex-wrap gap-[10px]">
          <span className="chip">Unlimited responses</span>
          <span className="chip">No live transcript</span>
          <span className="chip">Theme rollup</span>
        </div>
      </div>
    </button>
  </div>
</div>
```

#### New project — StakeholderSetup

- H1 44 / 400 / -0.01em "Set up the interviews."
- Caveat 22 clay below: "you can edit any of this later —"
- Wrapper: `<div className="card lined red-line" style={{ padding: '30px 36px 36px 70px' }}>` — note the +20px left padding to clear the red margin line.
- Inner grid `{ display: 'grid', gap: 28 }` of `.field`s.
- Numbered question rows: `gridTemplateColumns: '32px 1fr 24px', gap: 12`. Caveat 24 clay numerals; serif 18 input; mono 16 ink-4 `×` delete affordance.
- "+ add a question" Caveat 22 clay button.
- Footer row: `flex gap 12 mt 28`. clay lg "Save & invite stakeholders →" + ghost "Save as draft" + spacer + Caveat 20 ink-3 "you'll get a link to share with each person".

#### New project — FeedbackSetup

- H1 44 / 400 / -0.01em "Questions, sent wide."
- Caveat 22 sage below: "keep it open enough to surprise you —"
- Wrapper: `<div className="card flat" style={{ padding: '30px 36px 36px', background: 'var(--card-2)' }}>` + green `<Tape>` `top: -11, left: 60, rotate(-2deg)`.
- Fields: `project name`, `what you want to learn`, `must-ask questions —` using numbered notebook rows and `+ add a question`.
- Confirm row at the bottom: `padding: 14px 18px; background: rgba(255,255,255,0.5); border-radius: 6`. Sage circle ✓ + bold sans 13 + sans 12 ink-2.
- Footer row: sage lg "Preview & send →" + ghost "Save as draft".

#### Deep interview (`/i/[linkToken]`)

The participant page renders `<AppBar>` with crumb `[{label: project.name}, {label: '{respondent} · live'}]` and a clay chip on the right. The `<InterviewShell>` renders the inner layout:

```
<div className="participant-interview-layout" style={{ padding: '32px 40px 80px', maxWidth: 1320, margin: '0 auto', gap: 36 }}>
  <div style={{ position: 'relative' }}>
    <NotebookCard … />
    <NotebookControls … />   {/* only when live */}
  </div>
  <SidebarRail … />
</div>
```

`NotebookCard` = `card lined red-line` `padding: 38px 44px 44px 74px` `minHeight: 740` `position: relative`, with two tapes:
- yellow: `top: -11, left: 60, transform: rotate(-3deg)`
- green: `top: -9, right: 80, transform: rotate(4deg)`

Inside: Caveat 28 clay rotate(-1.5deg) `conversation with {label} —` → mono 11 ink-3 `Q{n}/{total}` baseline-aligned to serif 34 / 1.15 question wrapped in `<Scribble>` → transcript rows.

Transcript row shape: `display: grid; gridTemplateColumns: 90px 1fr; gap: 16; padding: 10px 0`. Speaker label is Caveat 20 colour clay (you) or ink-3 (gather), rotated `i % 2 ? -2 : 1` degrees. Body is serif 21 / 1.5.

Live row (when participant is currently speaking or paused): same grid, `padding: 14px 0 6px`. Caveat 20 clay `you →` rotated -1deg. Body is `<WaveBars count=22 height=42>` + Caveat 20 ink-3 placeholder text.

Margin note: `<MarginNote top={…}>` rendered on demand (e.g. when the system flags a "highlight" turn). Component handles position, rotation, and SVG arrow.

NotebookControls = below the card with `marginTop: 22; gap: 10`. Clay "◼ End conversation", ghost "Pause" / "Resume", spacer, Caveat 22 ink-3 `{elapsed} elapsed · {cap} cap`.

`SidebarRail` is sticky with `top: 90; alignSelf: start; gap: 18`. Three `.card flat` blocks:
1. Project context — Caveat 24 clay `hello —` → serif 24 project name → sans 13 / 1.55 ink-2 objective → `chip` row of `areasOfInterest`.
2. `today's questions` — Caveat 24 clay header → list of dashed-bordered rows with check-rings (done sage/sage, active clay/transparent, idle line/transparent) and serif 16 question (active fontWeight 600).
3. Anonymity — `card flat` with `background: var(--card-2)`. Eyebrow `Anonymity · {mode}` + sans 12.5 / 1.5 ink-2 disclaimer.

#### Feedback interview (`/t/[linkToken]`)

`<AppBar>` with sage chip `<dot/>words only · we don't keep audio`. Page wrapper: `min-h-screen grid grid-rows-[auto_1fr_auto]`. Main centred: `padding: 40px 24px; place-items: center` with `maxWidth: 760`.

```
<div className="text-center">
  <div className="eyebrow" style={{ marginBottom: 18 }}>for {sponsor} · {estTime}</div>
  <div className="card flat relative text-left mx-auto" style={{ padding: '40px 50px', maxWidth: 760 }}>
    <Tape tint="green" style={{ top: -11, left: '50%', transform: 'translateX(-50%) rotate(2deg)' }} />
    <div className="font-hand" style={{ fontSize: 26, color: 'var(--sage)', marginBottom: 8 }}>one question —</div>
    <h1 className="font-serif" style={{ fontSize: 38, fontWeight: 400, lineHeight: 1.18, letterSpacing: '-0.005em', margin: 0 }}>
      <Scribble>{prompt}</Scribble>
    </h1>
  </div>
</div>

<div className="grid place-items-center" style={{ marginTop: 56, marginBottom: 36 }}>
  <MicRing active={recording} disabled={transcribing} ariaLabel={recording ? 'Stop recording' : 'Start recording'} onClick={…}>
    {recording ? <Stop size={56} weight="fill" color="var(--card)" /> : undefined}
  </MicRing>
</div>

<div className="flex items-center justify-center gap-[18px] flex-wrap">
  {recording && <WaveBars count={20} height={36} />}
  <span className="font-serif" style={{ fontSize: 26, color: 'var(--ink-2)', fontStyle: 'italic' }}>
    {recording ? `recording · ${formatSeconds(t)}` : 'tap to record'}
  </span>
</div>

<p className="font-sans" style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 460, lineHeight: 1.5, margin: '24px auto 0', textAlign: 'center' }}>
  Take your time. Tap the mic and speak in your own words. When you're done, you'll see the text and can edit it before submitting.
</p>
```

Footer: `padding: 20px 36px; border-top: 1px dashed var(--line); flex justify-between flex-wrap gap-3`. Left: mono 11 ink-3 `gather · review`. Right: Caveat 18 ink-3 link `skip → I'd rather not answer`.

#### Completion

```
<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '80px 24px' }}>
  <div className="text-center" style={{ maxWidth: 640, position: 'relative' }}>
    <div style={{ marginBottom: 36 }}>
      <Stamp variant="sage">received · {ordinal} voice</Stamp>
    </div>
    <h1 className="font-serif" style={{ fontSize: 78, fontWeight: 400, lineHeight: 1.0, letterSpacing: '-0.02em', margin: '0 0 28px' }}>
      Thanks — that helps.
    </h1>
    <div className="font-hand inline-block" style={{ fontSize: 30, color: 'var(--clay)', transform: 'rotate(-1deg)', marginBottom: 32 }}>
      — really.
    </div>
    <p className="font-serif" style={{ fontSize: 22, lineHeight: 1.5, color: 'var(--ink-2)', margin: '0 auto 40px', maxWidth: 480 }}>
      {body}
    </p>
    {/* Optional 24-dot grid: 10×10 dots, gap 6, latest one bg sage + 0 0 0 4px sage-soft halo. */}
    <div className="font-sans" style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 24 }}>
      That's it. You can close this tab.
    </div>
    {/* Optional sticky note rotate(-2deg). */}
    <div className="inline-block" style={{ transform: 'rotate(-2deg)', marginTop: 16 }}>
      <StickyNote tint="sage" style={{ maxWidth: 320, padding: '20px 22px', textAlign: 'left' }}>
        <div className="font-hand" style={{ fontSize: 20, color: 'var(--ink)', lineHeight: 1.3 }}>
          when ~30 people have answered,<br />
          {sponsor} will see the themes — never your name.
        </div>
      </StickyNote>
    </div>
  </div>
</div>
```

#### Synthesis (`/app/projects/[id]`)

Outer wrapper `<div style={{ padding: '36px 40px 120px', maxWidth: 1320, margin: '0 auto' }}>`.

```
<section style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 36, marginBottom: 56 }}>
  <div className="card flat relative" style={{ padding: '38px 42px' }}>
    <Tape style={{ top: -11, left: '50%', transform: 'translateX(-50%) rotate(2deg)' }} />
    <div className="font-hand" style={{ fontSize: 26, color: 'var(--clay)' }}>what we heard —</div>
    <h1 className="font-serif" style={{ fontSize: 60, fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.018em', margin: '12px 0 26px' }}>
      <span style={{ color: 'var(--ink-2)' }}>Seven voices.</span><br />
      <span style={{ fontStyle: 'italic', color: 'var(--clay)' }}>One</span> unresolved decision.
    </h1>
    <p className="font-sans" style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 540 }}>
      Every stakeholder names the same bottleneck — <em>exception decisions have no clear owner</em>.
      None of them agree on who should hold it. That's your starting line.
    </p>
    <div style={{ marginTop: 26, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
      <Stamp>Synthesis ready</Stamp>
      <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
        6/7 interviews · 1 excluded for low coverage
      </span>
    </div>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
    {/* Four <BigStat> tiles */}
  </div>
</section>

<section style={{ marginBottom: 56 }}>
  <div className="section-head">
    <h2 className="font-serif" style={{ fontSize: 32, fontWeight: 400 }}>Who we talked to</h2>
    <span className="font-hand" style={{ fontSize: 20, color: 'var(--ink-3)' }}>— click anyone for their transcript</span>
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12 }}>
    {/* Session tiles, padding 16 12, rounded 8, border 1px line-soft, with avatar 32×32 hsl, label, dept · region, quality colour-coded */}
  </div>
</section>

{/* Themes ‒ same shape as ProjectEvidenceSurface */}
{/* In their words ‒ 12-col sticky-note grid */}
{/* Where they disagree ‒ 1fr 110px 1fr split panels */}
```

`BigStat` (`card flat`, padding 20 22): eyebrow label → flex baseline (serif 56 / 400 / 1.0 number, italic for clay/rose tones; mono 12 ink-3 small) → sans 12 ink-2 note.

Themes row: `card flat`, `padding: 20 26`, `gridTemplateColumns: 320px 1fr 200px auto`, `gap: 28`, `align-items: center`. Left col has square diamond `9px rotate(45deg)` in sentiment colour + eyebrow `0{idx} · {sentiment}` + serif 22 / 400 / 1.2 / -0.005em title. Centre col: sans 13.5 / 1.55 ink-2 summary. Right col: `<Spectrogram frequency={n} total={included}>` + mono 10 ink-3 `{freq}/{total} interviews`. Far right: ghost sm `evidence ↗`.

Quotes constellation: `gridTemplateColumns: repeat(12, 1fr); gap: 20`. The quotes use these arrays in order:

```js
const spans = [5, 4, 3, 5, 3, 4, 5]
const tints = ['cream', 'peach', 'sage', 'cream', 'lilac', 'peach', 'sage']
const rots  = [-2, 1.5, -1.8, 1, -1.2, 2, -0.5]
```

Each `<StickyNote>` renders Caveat 26 ink (or 22 if `text.length > 120`) and a footer flex with mono 10 ink-2 `— {label.toLowerCase()}` and mono 10 ink-3 `re: {theme}`.

Contradictions: outer `card flat`, padding 24 28. Header flex baseline-justified between serif 22 / 400 topic and ghost sm `evidence ↗`. Inner `gridTemplateColumns: 1fr 110px 1fr; gap: 20; align-items: center`. Position panels: `padding: 18 20; border-radius: 8; border: 1px solid (gold or sage)`. Background `var(--gold-soft)` or `var(--sage-soft)`. `eyebrow` POSITION A/B + mono 10 ink-3 `{N} voices` + serif 17 / 1.45 statement. Versus axis: text-center, mono 10 ink-3 `split` (uppercase letter-spaced 0.16em), 10×6 split bar with `flex: a/b`, Caveat 22 clay `{a} ↔ {b}`.

#### Session review (`/app/projects/{id}/sessions/{id}`)

The session review page is a consultant deep-dive on a single transcript. Single chrome bar (no second sticky row); the breadcrumb deepens to three segments and the right slot carries the pipeline status + transcript toggle + overflow menu.

```
<ReviewSelectionProvider>
  <ConsultantAppBar
    crumb={[
      { label: "Workspace", href: "/app" },
      { label: project.name, href: `/app/projects/${projectId}` },
      { label: respondent.label },
    ]}
    rightSlot={
      <ReviewStatusControls
        projectId={…} sessionId={…}
        excludedFromSynthesis={…}
        statuses={[
          { label: "Transcript", status: review.transcriptStatus },
          { label: "Analysis",   status: review.generatedStatus  },
          { label: "Quality",    status: review.qualityStatus    },
        ]}
      />
    }
  />

  <div style={{ padding: "32px 40px 80px", maxWidth: 1320, margin: "0 auto" }}>
    {/* Optional inline badge row: <Badge variant="rose">Excluded</Badge> */}

    <div className="flex min-w-0 gap-5">
      <aside style={{ position: "sticky", top: "calc(var(--app-bar-height) + 24px)" }}>
        <ReviewSiblingRail variant="compact" … />
      </aside>

      <section className="min-w-0 flex-1">
        <ReviewSynthesisTabs … />
      </section>

      <aside style={{ position: "sticky", top: "calc(var(--app-bar-height) + 24px)" }}>
        <div style={{ maxHeight: "calc(100vh - var(--app-bar-height) - 48px)" }}>
          <span className="eyebrow">Transcript</span>
          <ReviewTranscriptPane … />
        </div>
      </aside>
    </div>

    <ReviewEvidenceDrawer … />
  </div>
</ReviewSelectionProvider>
```

`<ReviewStatusControls>` (`components/review/review-status-controls.tsx`) renders three things:
1. A `<chip>` showing the aggregate pipeline status — `Ready` (sage), `Pending` (gold), `Failed` (rose), `Empty`/`Idle` (neutral). Click opens a popover listing each pipeline stage with its individual status.
2. A `<chip>` "Transcript" button, visible only at `xl:hidden` widths, that toggles the right transcript pane via `useOptionalReviewSelectionActions().toggleDrawer("transcript")`.
3. A circular overflow `…` menu (8×8) with one item: "Include in synthesis" / "Exclude from synthesis…" depending on current state. Excluding requires confirmation through an alert dialog using the same drawer-backdrop + cream card surface as `<Confirm>`.

Sibling rail (left) and transcript aside (right) anchor at `top: calc(var(--app-bar-height) + 24px)` — never use the legacy `top-32` / `top-14`. Both asides are hidden on small screens (`hidden lg:block` / `hidden xl:block`); on those widths the user toggles the transcript drawer via the chip in the AppBar right slot.

#### Sign-in

`min-h-screen` with AppBar then `mx-auto max-w-[520px] flex items-start padding 16 6`. Inner is a `card flat` with yellow tape, Caveat 24 clay `welcome —`, H1 48 / -0.018em "Sign in.", body sans 14 ink-2 description, magic-link form / OAuth button, `divider-dashed`, mono 12.5 ink-3 small print.

#### Landing (`/`)

Hero: H1 64 / 400 / 1.02 / -0.02em with one italic-clay accent word; lead serif 22 ink-2 maxW 560 lh 1.5; CTAs ink + ghost. Right column: `card flat` paper showing a synthesis preview. Below: three "pillar" cards in a 3-col grid.

#### Embed (`/embed/testimonials/[id]`)

Cream background, mono `In their words` eyebrow, italic brand-coloured business name in the H1 32 / -0.012em headline, Inter Tight pill CTA. Approved reviews render as `.sticky` notes with rotation, gold star row, serif 17 quote, mono 11 attribution. Footer mono 11 link "Powered by gather.".

---

## 7. Component primitives

### Card

```tsx
<Card>            // .card  default, --shadow-2
<Card flat>       // .card.flat  --shadow-1
<Card lined>      // ruled-paper background
<Card redLine>    // 1px red margin line at left:50px
```

`CardTitle` = font-serif text-2xl font-normal tracking-tight. `CardDescription` = font-sans text-[13px] leading-6 ink-2.

### Button

CVA wrapper around `.btn`. Variants:
- `default` → ink fill (`bg: var(--ink); color: var(--card)`)
- `clay` → `bg: var(--clay); color: var(--card)` — primary CTAs
- `sage` → `bg: var(--sage); color: var(--card)` — feedback / approve
- `ghost` → 1.5px ink outline, no shadow, `hover:bg-black/5`
- `outline` → alias for ghost (legacy)
- `secondary` → alias for ghost (legacy)
- `destructive` → ghost outline tinted rose
- `link` → inline text link, clay underline

Sizes: `sm` (`padding: 7 14; fontSize: 12`), `default` (`padding: 11 20; fontSize: 14`), `lg` (`padding: 14 26; fontSize: 15`). Shadow: `0 2px 0 rgba(0,0,0,0.15)` rest, `0 3px 0 rgba(0,0,0,0.15)` hover.

### Badge / Chip

```tsx
<Badge>neutral</Badge>          // default neutral chip
<Badge variant="clay" dot>live</Badge>
<Badge variant="sage">collecting</Badge>
<Badge variant="gold">scheduling</Badge>
<Badge variant="rose">excluded</Badge>
<Badge variant="solid">synthesis ready</Badge>
```

Always `rounded-full px-3 py-1 text-xs font-medium font-sans`. Legacy variants `accent → clay`, `success → sage`, `warning → gold`, `danger → rose`.

### Field + Input + Textarea

The notebook field. Caveat clay label above (22px), then a transparent input with `border-bottom: 1.5px dashed var(--line)`. On focus, border becomes `solid var(--clay)`. Inputs render at `font-serif text-xl` so the form feels like writing in a journal.

```tsx
<Field label="project name" htmlFor="name">
  <Input id="name" name="name" required />
</Field>
```

### Wordmark / AppBar / Crumb

`<Wordmark>` = Caveat 38 lowercase + clay 42 dot. `<AppBar>` = sticky top, padding 18 36, dashed bottom. `<Crumb>` = Inter Tight 13 / ink-2 with `/` separators in ink-4. `<AppBarAvatar>` = 32×32 round, clay (default) / sage / ink, `font-sans 600 12` initials.

### ProjectTile

```tsx
<article className="project-tile has-actions [live] [archived]" style={{}}>
  <a className="project-tile-link" href={…}>
    <TypeFlavor projectType={…} />        {/* Caveat 18 clay/sage/ink-2 */}
    <h3 className="font-serif" 26/400/1.15/-0.005em>{name}</h3>
    <div className="font-sans" 13 ink-3>{tagline}</div>

    {/* Progress: testimonial = dot row 9×9, clay/line; feedback/discovery = fill bar 6h max-w 140 sage/clay */}
    <div className="flex items-center gap-2">
      <span className="font-mono" 11 ink-2>{done}<span ink-4>/{total}</span></span>
      {/* dots OR bar */}
    </div>

    <div className="flex justify-between items-center">
      <Badge variant={…} dot={…}>{statusLabel}</Badge>
      <span className="font-mono" 10.5 ink-3>{updatedAt}</span>
    </div>
  </a>
  <button className="project-tile-x" aria-label="Archive project"><X /></button>
  {/* archived tiles also render a dashed restore pill at bottom right */}
</article>
```

`.project-tile.live::after` adds the pulsing clay dot + halo at `top: 14, right: 14` with `live-pulse 1.6s` keyframe.
When a tile has top-right actions, use `.project-tile.has-actions.live::after { right: 52px; }` so the live dot never overlaps the archive/delete X. The X is a quiet 28×28 icon button: transparent by default, rose-soft on hover. Archived tiles use `card-2`, status label `archived`, the same X now means permanent delete after confirmation, and a small dashed `restore` pill sits at bottom right.

Status chip mapping:
- `inProgress > 0` → `clay` `dot=true` `"live"`
- `synthesizing` → `clay` `dot=true` `"synthesizing"`
- `active && completed > 0` → `sage` `dot=true` `"collecting"`
- `active` (no sessions yet) → `gold` `"scheduling"`
- `complete` → `neutral` `"complete"`
- `archivedAt` present → `neutral` `"archived"`

### EvidenceDrawer

Right slide-in drawer: `position: fixed; top:0 right:0 bottom:0; width: min(540px, 100vw); background: var(--card); shadow: -12px 0 40px rgba(0,0,0,0.15)`. Backdrop: `position: fixed; inset:0; background: rgba(40,30,18,0.4)`. Animations: `slide-in 0.25s cubic-bezier(.2,.8,.2,1)` + `fade-in 0.2s`. Header has dashed-bottom border, `padding: 24 28`. Body padding `28 32`.

---

## 8. Ornaments

Each ornament has a CSS class plus a typed React component.

### Tape — `<Tape tint="yellow|green|rose" style>`

```css
.tape {
  position: absolute;
  width: 96px; height: 22px;
  background: rgba(245,220,130,0.78);
  border: 0.5px solid rgba(180,150,80,0.35);
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
}
.tape.green { background: rgba(200,220,180,0.78); }
.tape.rose  { background: rgba(230,180,170,0.72); }
```

Default placements (top-of-card):
- Centered: `top: -11, left: 50%, transform: translateX(-50%) rotate(2deg)`
- Left: `top: -11, left: 60, transform: rotate(-3deg)` or `rotate(-2deg)` for feedback variant
- Right: `top: -9, right: 80, transform: rotate(4deg)` or `top: -11, right: 32, transform: rotate(3deg)` for type-picker
- TypePicker stakeholder: `top: -11, left: 32, transform: rotate(-3deg)`
- TypePicker feedback: `top: -11, right: 32, transform: rotate(3deg)`

**One tape per card max** — *exception*: DeepInterview notebook has two (yellow left + green right), as a deliberate signature.

### Stamp — `<Stamp variant="stamp|sage|ink">…</Stamp>`

```css
.stamp {
  display: inline-block;
  border: 2.5px solid var(--stamp);
  color: var(--stamp);
  padding: 6px 14px 5px;
  font-family: var(--font-sans);
  font-weight: 700; font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  transform: rotate(-3deg);
  border-radius: 3px;
  opacity: 0.82;
}
```

One per page max. Used: synthesis hero `Synthesis ready` (default stamp red); completion `received · 24th voice` (sage).

### Pin — `<Pin tint="stamp|sage|gold|clay">`

12×12 round with 3D shadow at `top: -7px, left: 50%`. Used to "tack" a sticky note.

### Scribble — `<Scribble>{children}</Scribble>`

Inline span with an SVG hand-drawn underline as `background-image`. Wrap one phrase per heading at most.

```css
.scribble {
  background-image: url("data:image/svg+xml,…stroke clay…");
  background-repeat: no-repeat;
  background-size: 100% 8px;
  background-position: 0 95%;
  padding-bottom: 4px;
}
```

Used: DeepInterview Q heading, FeedbackInterview question H1, occasional sign-in/landing accent.

### WaveBars — `<WaveBars count={n} height={n}>`

```css
.wave-bars { display: inline-flex; align-items: center; gap: 3px; height: 56px; }
.wave-bars .bar { width: 3.5px; border-radius: 99px; background: var(--clay);
                  animation: bar-breathe 1.1s ease-in-out infinite; }
@keyframes bar-breathe {
  0%, 100% { height: 8px;  opacity: 0.5; }
  50%      { height: 48px; opacity: 1.0; }
}
```

Default `count: 24, height: 56`. Common usages:
- DeepInterview live row: `count: 22, height: 42`
- FeedbackInterview status: `count: 20, height: 36`

### MicRing — `<MicRing active onClick>`

200×200 round with radial gradient clay → oklch(54% 0.16 38), inset shadow + outer glow. Two pseudo-element ripples at 0s and 1.2s delays.

```css
.mic-ring { width: 200px; height: 200px; border-radius: 50%;
            animation: mic-pulse 2.4s ease-in-out infinite; … }
.mic-ring::before, .mic-ring::after { animation: mic-ripple 2.4s ease-out infinite; }
.mic-ring::after { animation-delay: 1.2s; }
```

Toggle paused via `animationPlayState`. Inner SVG = mic icon in card colour.

### Spectrogram — `<Spectrogram frequency={n} total={N} color="var(--clay)">`

5px-wide bars in a 28px-tall track. On bars use `frequency` count; off bars are `var(--line)`. Bar height = `8 + ((j*41) % 20)` for on bars, `4` for off — deterministic.

### StickyNote — `<StickyNote tint="cream|peach|sage|lilac" rotate={n}>`

```css
.sticky { background: #fff2b8; padding: 22px 24px 20px; border-radius: 3px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.08), 0 8px 18px rgba(0,0,0,0.07); }
.sticky.peach { background: #ffe1cc; }
.sticky.sage  { background: #e3efcf; }
.sticky.lilac { background: #f0e0ff; }
```

Used for synthesis quotes (12-col grid with rotations), completion "what happens next" (rotate -2deg), landing testimonial preview (rotate 4deg).

### MarginNote — `<MarginNote top={n} rotate={n} width={n}>{children}</MarginNote>`

Caveat 22 clay block, absolutely positioned at `right: -56, top: {n}`, default `width: 220`, default `rotate: 4deg`. Includes an SVG arrow at `left: -55, top: 10`:

```jsx
<svg width={60} height={30}>
  <path d="M 55 15 Q 30 5, 5 20" stroke="var(--clay)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
  <path d="M 10 15 L 5 20 L 12 22"  stroke="var(--clay)" strokeWidth={1.5} fill="none" />
</svg>
```

Used inside `<NotebookCard>` for in-the-margin annotations on a transcript turn.

---

## 9. Copy library (verbatim)

**Use these strings as-is.** When they are parametric, parameters are in `{braces}`; the rest of the line stays exact.

### Caveat phrases (clay unless noted)

- `good morning, {firstName} —` (dashboard greeting, 28)
- `— need a look` (dashboard "In motion" helper, 18)
- `+ start a new one` (dashboard empty tile, 32)
- `your bookshelf —` (projects list, 24)
- `what kind of conversation —` (TypePicker eyebrow, 24)
- `you can edit any of this later —` (StakeholderSetup eyebrow, 22)
- `keep it open enough to surprise you —` (FeedbackSetup eyebrow, 22, **sage**)
- `keep it simple — they're saying yes already.` (TestimonialSetup eyebrow, 22, **sage**)
- `questions —` (StakeholderSetup section, 22)
- `+ add a question` (StakeholderSetup affordance, 22)
- `you'll get a link to share with each person` (StakeholderSetup trailing hint, 20, ink-3)
- `you'll get a link to share` (FeedbackSetup trailing hint, 20, ink-3)
- `conversation with {label} —` (DeepInterview greeting, 28, rotate(-1.5deg))
- `gather →` / `you →` (DeepInterview transcript speaker tags, 20)
- `hello —` (sidebar context header, 24)
- `today's questions` (sidebar checklist header, 24)
- `{elapsed} elapsed · {cap} cap` (NotebookControls trailing hint, 22, ink-3)
- `for {sponsor} · {estTime}` (FeedbackInterview eyebrow — actually `.eyebrow`, mono)
- `one question —` (FeedbackInterview Caveat, 26, **sage**)
- `recording · {MM:SS}` / `tap to resume` / `tap to record` (status under MicRing — italic 26 serif ink-2; not Caveat)
- `skip → I'd rather not answer` (FeedbackInterview footer, 18, ink-3)
- `— really.` (Completion accent, 30, rotate(-1deg))
- `what we heard —` (synthesis hero, 26)
- `— click anyone for their transcript` (synthesis "Who we talked to" helper, 20, ink-3)
- `— pulled from every transcript` (synthesis themes helper, 20, ink-3)
- `— read these before drafting anything` (synthesis quotes helper, 20, ink-3)
- `— bring these to the table` (synthesis contradictions helper, 20, ink-3)
- `{a} ↔ {b}` (VersusAxis label, 22)
- `topics —` / `must-ask questions —` / `background —` (synthesis project-setup labels, 20)
- `+ create next version` (project-setup details summary, 22)
- `listening, made portable —` (landing eyebrow, 28)
- `ready when you are —` (landing CTA section eyebrow, 24)
- `welcome —` (sign-in eyebrow, 24)
- `set up in an afternoon — reads itself the next morning.` (landing sticky-note copy, 20, ink)

### Section headings (serif 32 unless noted)

- "In motion" (26)
- "Quiet for now" (22, ink-2)
- "Two ways to listen. *Pick one.*" (56, italic ink-3 on second clause)
- "Set up the interviews." (44)
- "Questions, sent wide." (44)
- "Sign in." (48)
- "Projects" (44)
- "Who we talked to" (32)
- "Themes" (32)
- "In their words" (32)
- "Where they disagree" (32)
- "what we heard —" → headline body (60, italic-clay accent)
- "Thanks — that helps." (78)

### Chip / status labels

- TypePicker stakeholder chips: `Up to 12 sessions` · `Live transcript` · `Cross-interview synthesis`
- TypePicker feedback chips: `Unlimited responses` · `No live transcript` · `Theme rollup`
- TypePicker testimonial chips: `10 sec` · `Voice → text` · `Embeddable`
- DeepInterview AppBar chip: clay dot + `recording transcript only`
- FeedbackInterview AppBar chip: sage dot + `words only · we don't keep audio`
- Synthesis AppBar chip: `refreshed {N} min ago` (or `View live interview` ghost button)
- Status chips (project tile): `live`, `synthesizing`, `collecting`, `scheduling`, `complete`, `excluded`
- Hero stamp: `Synthesis ready` (≥3 included sessions)
- Completion stamp: `received · {Nth} voice`

### Button labels

- TypePicker no buttons (cards are themselves buttons).
- StakeholderSetup: `Save & invite stakeholders →` (clay lg) + `Save as draft` (ghost)
- FeedbackSetup: `Preview & send →` (sage lg) + `Save as draft` (ghost)
- TestimonialSetup: `Create review link →` (clay lg) + `Save as draft` (ghost)
- NotebookControls: `◼ End conversation` (clay) + `Pause` / `Resume` (ghost)
- FeedbackInterview: `I'm done — submit` (sage lg) + `Start over` (ghost)
- Synthesis hero: `Copy share link` (CopyLink button) + `Preview as respondent` (ghost sm) + `Refresh synthesis` (RefreshSynthesisButton)
- Synthesis evidence rows: `evidence ↗` (ghost sm)
- Sign-in: `Send magic link →` (clay lg) or `Continue with {provider} →` (clay lg)

### Disclaimers

- Anonymity (pseudonymous): `We keep words, not audio. Your name is replaced with "{label}" before the consultant sees anything.`
- Anonymity (anonymous): `Fully anonymous — no name or role attached to what you say.`
- Anonymity (named): `Words only — we don't keep audio. The consultant will see who said what.`
- Hide-transcript confirm row: `Hide the live transcript from participants` + `Recommended for feedback. They speak; we listen. They see a thank-you.`
- Completion small print: `That's it. You can close this tab.`

---

## 10. Patterns checklist

Before merging a UI change, confirm:

- [ ] Page wraps in its own outer `<div style={{ padding, maxWidth, margin: '0 auto' }}>` — not `<AppShell>`'s wrapper.
- [ ] Section heads use `.section-head` (H2 + Caveat helper on the same baseline).
- [ ] Hero / page H1 matches the value in the Type Scale table.
- [ ] At most one `<Stamp>` per page.
- [ ] At most one `<Tape>` per card. *Exception*: DeepInterview notebook (two).
- [ ] At most one `<Scribble>` per heading.
- [ ] At most one italic-clay accent word per serif headline.
- [ ] No `font-bold`, no `font-semibold` on headings — all 400 weight.
- [ ] No `dark:` Tailwind variants. No `.dark` selectors.
- [ ] No `bg-popover`, `bg-foreground/30`, `backdrop-blur` legacy. Use `var(--card)` + `var(--shadow-pop)`.
- [ ] No `.panel`, `.panel-flush`, `.panel-compact`, `.eyebrow-sm`, `.stack`, `.divider`, `.focus-ring`, `.page-gradient` — these are removed.
- [ ] All colours are CSS variables (`var(--clay)`, `bg-primary`, `text-muted-foreground`) — no raw hex except the four sticky-note tints.
- [ ] Caveat is used as type, not decoration (margin notes, form labels, eyebrow flavors).
- [ ] Eyebrows always pair with letter-spacing.
- [ ] Verbatim copy strings from §9 — when divergence is needed, prefer parametric rather than rewording.
- [ ] WaveBars delay calculation is deterministic to avoid hydration mismatch.
- [ ] No reintroduction of dark mode.

---

## 11. File reference

| Concern | Path |
|---|---|
| Theme tokens, global utilities, animations | `gather/app/globals.css` |
| Fonts | `gather/app/layout.tsx` |
| AppShell (chrome only) | `gather/components/dashboard/app-shell.tsx` |
| AppBar + AppBarAvatar | `gather/components/ui/app-bar.tsx` |
| Wordmark | `gather/components/ui/wordmark.tsx` |
| Crumb | `gather/components/ui/crumb.tsx` |
| Field wrapper | `gather/components/ui/field.tsx` |
| Card | `gather/components/ui/card.tsx` |
| Button | `gather/components/ui/button.tsx` |
| Badge | `gather/components/ui/badge.tsx` |
| Input / Textarea | `gather/components/ui/input.tsx`, `textarea.tsx` |
| Tabs | `gather/components/ui/tabs.tsx` |
| Confirm dialog | `gather/components/ui/confirm.tsx` |
| Ornaments (Tape, Stamp, Pin, Scribble, WaveBars, MicRing, Spectrogram, StickyNote) | `gather/components/ui/ornaments.tsx` |
| MarginNote ornament | `gather/components/ui/margin-note.tsx` |
| EvidenceDrawer shell | `gather/components/ui/evidence-drawer.tsx` |
| ProjectTile | `gather/components/dashboard/project-tile.tsx` |
| Synthesis evidence surface (themes / quotes / contradictions + drawer wiring) | `gather/components/dashboard/project-evidence-surface.tsx` |
| Synthesis page | `gather/app/app/projects/[projectId]/page.tsx` |
| Testimonial rollup | `gather/components/dashboard/testimonial-project-detail.tsx` |
| New-project form | `gather/components/dashboard/new-project-form.tsx` |
| Dashboard | `gather/app/app/page.tsx` |
| Projects list | `gather/app/app/projects/page.tsx` |
| Sign-in | `gather/app/sign-in/page.tsx` |
| Landing | `gather/app/page.tsx` |
| Deep interview page | `gather/app/i/[linkToken]/page.tsx` |
| Interview shell engine | `gather/components/participant/interview-shell.tsx` |
| Interview notebook surfaces (NotebookCard, SidebarRail, NotebookControls, PreStartCard, CompletionSurface) | `gather/components/participant/interview-shell-surfaces.tsx` |
| Shared `<Completion>` screen | `gather/components/participant/completion.tsx` |
| Feedback / testimonial capture page | `gather/app/t/[linkToken]/page.tsx` |
| Testimonial capture shell | `gather/components/testimonials/testimonial-capture-shell.tsx` |
| Embed page | `gather/app/embed/testimonials/[projectId]/page.tsx` |
| `cn` utility | `gather/lib/utils.ts` |

---

## 12. Reference design

Canonical: `gather/project/final/` in the design archive. Specifically:
- `final/final.css` — tokens, ornament classes, keyframes (the source for §1, §2, §5, §8).
- `final/dashboard.jsx` — Dashboard, TypePicker, StakeholderSetup, FeedbackSetup recipes.
- `final/interviews.jsx` — DeepInterview, FeedbackInterview, Completion recipes.
- `final/synthesis.jsx` — Synthesis hero, BigStat, "Who we talked to", themes, quotes, contradictions, EvidenceDrawer recipes.
- `final/chrome.jsx` — AppBar, Crumb, WaveBars, useRoute (the source for §6.1).
- `final/index.html` — Loads fonts and wires the SPA together.

When the implementation drifts from the design, **update the implementation, not the design**.
