# GatherAI — UX/UI & Copy Improvement Plan

> Working plan for the 2026-Q2 UX overhaul. Update the **Status** table as tasks land. Source of truth for copy, IA, primitives, and participant flow decisions.

## Status

| # | Task | Status |
|---|---|---|
| 1 | Copy pass: rewrite user-facing strings across all surfaces | done |
| 2 | Build new UI primitives (breadcrumb, toast, skeleton, empty-state, confirm, voice-status, copy-link, relative-time) | done |
| 3 | Rebuild participant flow as single-page agent-led | done |
| 4 | Redesign consultant dashboard with density + evidence drawer | done |
| 5 | Accessibility, motion, contrast verification | done |

## Context

GatherAI is a voice-first feedback tool with **two very different users in one product**:

- A **consultant** running post-experience respondent interviews. They are an expert, time-pressured, switching contexts, and need to trust the synthesis they're reading.
- A **participant** who clicked a link, is probably on their phone, possibly nervous about being recorded by an AI, and has no login and no support.

The current build has a coherent visual system (see `STYLE_GUIDE.md`) but three compounding problems:

1. **Copy leaks developer internals into user surfaces.** "WebRTC + server-minted secrets," "scaffolded routes," "analysis jobs queued," technical storage disclaimers, "Supabase RLS" — all visible to users. The worst offender is a participant-facing error that reads "*Realtime credentials are not configured yet. The participant flow is scaffolded and ready for env wiring.*" (`gather/components/participant/interview-shell.tsx:114`).
2. **UX lacks feedback loops.** No loading states during the 2–3s realtime provisioning; no confirmations after excluding a session; no empty states; no breadcrumbs between project → session; no `aria-live` on status changes; no pre-flight mic check before the participant hits "Start."
3. **Layout is generous to the point of sparse.** Panels are 32px-radius with `p-6`; `gap-6` between every section; `max-w-7xl`. On a consultant's dashboard where density = decision speed, this reads as "early-stage demo," not "working tool."

Goal: **keep the visual DNA** (warm off-white, terracotta primary, Montserrat, frosted panels) but make the consultant feel like a senior colleague just handed them a notebook, and make the participant feel like a thoughtful person is listening — not an AI running a queue.

## Design Principles (sources)

These are the lenses every decision below is filtered through.

1. **"Craft is a feature."** (Karri Saarinen, Linear, Lenny ep. 152) — Latency, loading states, copy precision, and keyboard flow are part of the product, not polish. Add: skeletons, toast confirmations, `⌘K` command palette for the consultant.
2. **Clarity over cleverness.** (Julie Zhuo, *The Making of a Manager*) — Every label says what the button does, not what it is. "Refresh synthesis" → "Re-run synthesis with latest interviews."
3. **Evidence is authority.** (Teresa Torres, continuous discovery) — Every synthesized claim must show the transcript segment it came from, one click away. This is the single trust mechanism that separates GatherAI from "ChatGPT summarised my interview."
4. **Peak-end rule.** (Kahneman, via Jason Spielman / Airbnb design) — The participant's last moment ("Interview completed. 2 analysis job(s) queued…") is currently the lowest point. Redesign the ending to be the warmest moment in the flow.
5. **Labor-illusion / progressive disclosure.** (Nielsen 4 & 6) — When we provision the realtime session, *show work happening*. When we auto-save a transcript segment, *say so*, don't hide it.
6. **"Talk like a human."** (Mailchimp Content Style Guide) — Contractions, short sentences, no passive voice, no product name in copy the user didn't ask for.
7. **Opinionated defaults.** (Stripe design ethos) — 15-minute duration cap, pseudonymous mode, strict coverage — pre-selected with an "Adjust" link, not a form to fill.
8. **Less chrome, more content.** (Dieter Rams #5) — Reduce panel padding, shrink sidebar width, drop redundant "Environment" status tile, collapse duplicate disclosure cards.

---

## A. Copy System (world-class rewrite)

### A.1 Voice & Tone Guidelines (new file: `docs/voice-and-tone.md`)

| Surface | Voice | Do | Don't |
|---|---|---|---|
| **Consultant** | A trusted senior colleague. Confident, specific, numeric where possible. | "6 interviews completed. 2 flagged for review." | "Feedback operations room." |
| **Participant** | A warm, curious human who's genuinely listening. | "When you're ready, press start. It's a 15-minute conversation — you can pause anytime." | "Review the disclosure, then start when you are ready." |
| **Errors** | Plain English, blameless, one suggested next step. | "Your mic didn't connect. Check browser permissions and try again." | "Realtime credentials are not configured yet." |
| **Success** | Short, specific, verb-led. | "Synthesis updated — 3 new themes." | "Interview completed. 2 analysis job(s) queued." |
| **Empty states** | Set expectation + give one clear action. | "No projects yet. Create one to share a link with respondents." | (blank) |

### A.2 Banned words (anywhere a user can see them)

`scaffold(ed)`, `MVP`, `WebRTC`, `voice transport`, `credentials`, `env`, `mock`, `job queue`, `route handler`, `service role`, `RLS`, `privileged`, `bootstrap`, `minted`, `recovery token`, `metadata prompts`, `ingestion`, `cross-interview synthesis`.

### A.3 Screen-by-screen copy (before → after)

#### Landing (`gather/app/page.tsx`)

| Before | After |
|---|---|
| "Voice-first discovery" (badge) | "For teams improving real experiences" |
| "Interview stakeholders at scale without losing transcript evidence." | "Collect honest feedback after any experience without running every interview yourself." |
| "GatherAI turns discovery into a structured voice workflow…" | "Share one link. A thoughtful AI interviewer listens to each respondent and hands you back themes, contradictions, and improvement priorities — every line traceable to a real quote." |
| "Open consultant workspace" / "Preview participant link" | "Go to workspace" / "See what respondents see" |
| Card: "Realtime stance" — "WebRTC + server-minted secrets" | Card: "Runs in a browser" — "No app install. Stakeholders click a link and start talking." |
| Card: "Governance stance" — "Generated AGENTS, frozen docs, explicit decisions" | Card: "Evidence, not vibes" — "Every theme links back to the transcript segment it came from." |
| Card: "Current scaffold" | **Remove entirely.** Dev-team status, not user copy. |

#### Sign-in (`gather/app/sign-in/page.tsx`)

| Before | After |
|---|---|
| "Magic-link access for the solo consultant workspace" | "Sign in to your workspace" |
| "The MVP uses Supabase email authentication and one workspace per consultant." | "Continue with Google to open your workspace. No password to remember." |
| "Auth boundaries in this scaffold" card | **Remove.** Replace with one clear next step: "Create projects, share links, and review responses from one workspace." |

#### Consultant home (`gather/app/app/page.tsx`)

| Before | After |
|---|---|
| Badge: "Consultant overview" | Badge: "Workspace" |
| H1: workspace name | Keep workspace name as H1. Above it, add a generic friendly greeting eyebrow: **"Welcome back."** (no name — we don't always have one and don't want to capture one just for a greeting). |
| "Monitor project progress, surface low-quality interviews early, and keep synthesis tied to transcript evidence." | **Delete.** Dashboard doesn't need an intro paragraph. |
| Metric: "In progress" / "Participants currently in active or resumable interviews." | "Live now" / "{N} interviews in progress." |
| Metric: "Flagged" / "Low-quality interviews requiring consultant review or exclusion." | "Needs review" / "Short answers or unclear responses." |
| Card: "Dashboard design notes — Signal over decoration" | **Remove.** Internal design note masquerading as content. |

#### New project (`gather/app/app/projects/new/page.tsx`)

| Before | After |
|---|---|
| H1: "Configure the next interview project" | "New feedback project" |
| "The MVP prioritizes configuration that drives coverage…" | "Set the objective, pick the topics, and draft the questions. You can edit everything after sharing the link." |
| Label: "Areas of interest" / placeholder "One per line" | "Topics to cover" / "One topic per line — e.g., 'Approval bottlenecks'" |
| Label: "Required questions" | "Must-ask questions" |
| Label: "Duration cap (minutes)" | "How long? (minutes)" |
| Label: "Anonymity mode" with options "Named / Pseudonymous / Anonymous" | "How respondents are identified" with options: **"By name"**, **"By role (e.g., 'Respondent A')"**, **"Fully anonymous"** + one-line helper under each. |
| Submit: "Save project" | "Create project" |

#### Project detail (`gather/app/app/projects/[projectId]/page.tsx`)

| Before | After |
|---|---|
| Card: "Coverage-first interview setup" | "Interview setup" |
| Eyebrow: "Areas of interest" | "Topics" |
| Eyebrow: "Required questions" | "Must-ask questions" |
| Card: "Project synthesis" | "What we're hearing" |
| Eyebrow: "Top problems" | "Top pain points" |
| Eyebrow: "Suggested focus areas" | "Recommended focus areas" |
| Card: "Cross-interview synthesis" | "Themes across interviews" |
| Card: "Transcript-backed interviews" | "Sessions" |
| "Refresh synthesis" button | "Re-run synthesis" + tooltip: "Includes all non-excluded interviews." |
| Badge: "Low quality" | "Needs review" |
| "Last activity: {ISO}" | "Last active 12 min ago" (relative time) |
| "Quality score: 84%" | "Coverage 84% · Specificity 91%" (split, meaningful) |

#### Participant entry (`gather/app/i/[linkToken]/page.tsx`)

| Before | After |
|---|---|
| Badge: "Public participant link" | "For you" |
| H1: "Share perspective before the team decides next steps" | "A short conversation about your experience." |
| "This short AI interview helps the consultant understand pain points…" | "The team behind this experience would love to hear what worked, what missed, and what to improve next time. I'm an AI that'll ask a few questions and listen." |
| Disclosure card: technical storage language | **"How it works"** with three plain lines: "• I'll ask a few questions. • We'll cover one topic at a time. • You can pause or stop whenever you need." |

#### Interview shell (`gather/components/participant/interview-shell.tsx`)

| Before | After |
|---|---|
| "Review the disclosure, then start when you are ready." | "Take a breath. Press start when you're ready." |
| "Creating your session and preparing voice transport…" | "Setting up your microphone…" |
| "Realtime credentials are not configured yet. The participant flow is scaffolded and ready for env wiring." | "We can't start a live voice session right now. Try refreshing the page — if it keeps happening, let {consultantName} know." |
| "Realtime voice transport is connected." | "I'm listening. Take your time." |
| "Stored 2 transcript segment(s) for this session." | **Hide entirely.** Participant should never see "stored N segments." |
| "Interview completed. 2 analysis job(s) queued for cleaning, extraction, scoring, and synthesis." | "Thanks — that was genuinely useful. Your conversation will help improve the experience. You can close this tab." |
| "Interview guideposts" card | "Before we start" card. Bullets: "• One question at a time. • Take as long as you want to answer. • You can pause or end early — nothing is lost." |
| "Metadata prompts" | "A few quick questions first" |
| "Session status" / session ID / recovery token shown | **Remove IDs entirely from the UI.** Persist recovery token in a cookie. |

### A.4 CTA standardization table

| Context | Verb + Object |
|---|---|
| Create a project | **"Create project"** (not "Save") |
| Open any project | **"Open"** (row-level), **"Go to project"** (header-level) |
| Share the respondent link | **"Copy link"** (primary) + **"Preview what they see"** (secondary) |
| Re-run analysis | **"Re-run synthesis"** |
| Exclude an interview | **"Exclude"** → confirm → toast: "Excluded. Undo" |
| End an interview | **"I'm done"** (participant), **"End interview"** (consultant) |

---

## B. Information Architecture Changes

### B.1 Split marketing and app

Root `/` is currently the marketing page, but an authenticated consultant visiting `/` sees dev-flavored cards. **Auto-redirect authenticated users from `/` → `/app`.** Keep `/` as the external landing for unauthenticated visits.

### B.2 Breadcrumbs for the consultant

Add a lightweight breadcrumb bar to `/app/projects/:id` and deeper:

```
Workspace › Riverstone redesign › Sarah M. (session)
```

Placed above the H1, `text-xs text-muted-foreground`, with `›` separators. Implements Don Norman's "where am I, how did I get here."

### B.3 Participant flow — single page, agent-led

One page, one URL. No staged UI, no progress dots, no separate mic-check screen. The flow is conversational:

1. **Page loads** → user sees the project intro, a short "How it works" orientation, and one primary button: **"Start when ready"**.
2. **User taps Start** → browser native mic permission prompt fires (we call `getUserMedia({ audio: true })` first thing). On grant, the realtime session connects silently.
3. **Agent speaks first** → a short scripted opener: *"Hi — thanks for making time. We'll spend about 15 minutes on {project topic}. I'll ask one thing at a time, and you can take as long as you want. Just say 'ready' when you'd like to start."*
4. **User says "ready"** → this implicitly proves both directions of the channel work (we heard them say it, they heard the opener). Agent acknowledges and asks the first must-ask question. **Timer starts here, not before.**
5. **Live conversation** → `VoiceStatus` indicator shows listening / thinking / speaking. Timer in the corner ("4 / ~15 min"). Two controls only: **Pause** and **I'm done**.
6. **End** → dedicated warm panel ("Thanks — that was genuinely useful. You can close this tab.").

Implementation notes:
- The "ready" detection is a soft signal — the agent listens for affirmative intent ("ready", "yes", "let's go", "okay") and proceeds. If the participant just starts answering questions, the agent rolls with it.
- No mic-check UI to maintain. The opener line *is* the mic check — if the participant doesn't respond, we'll know within 5–10 seconds and can re-prompt: *"Can you hear me okay?"*
- No metadata stage in v1 unless the project explicitly configured prompts; in that case the agent asks them verbally as part of the opener, not via a form.
- All visual transitions stay in place — no morphing cards, no stage indicators. The agent's voice carries the structure.

### B.4 Participant "end" screen becomes a peak moment

Currently: text update in the same card ("Interview completed. 2 analysis jobs queued."). **Replace with a dedicated full-width celebration panel**: "Thanks for sharing what's on your mind." + one-line reassurance + a subtle animated checkmark. No IDs, no tokens, no jobs.

---

## C. Visual / Density Changes (respecting STYLE_GUIDE.md)

Everything below **keeps** OKLCH tokens, Montserrat, terracotta primary, frosted `.panel`, and `rounded-[32px]`. We adjust padding, widths, and introduce new components — no new colors, no shadows beyond the panel signature.

### C.1 Tighten the packaging

| Token | Current | Proposed | Why |
|---|---|---|---|
| `.panel` padding | `p-6` | `p-5 lg:p-6` | Tighter on smaller viewports. |
| Page container gap | `gap-6` | `gap-4 lg:gap-5` | Less vertical air between sections. |
| Page horizontal padding | `px-4 sm:px-6 lg:px-8` | unchanged | Already right. |
| Sidebar width | `lg:w-80` (320px) | `lg:w-72` (288px) | Gives main content 32px more. |
| Card title | `text-lg` | unchanged | Already tight. |
| Metric value | `text-4xl` / `text-5xl` | `text-3xl` with `tracking-tight` | Dense dashboards want compact numbers. |
| Panel radius | `rounded-[32px]` | unchanged | Signature. |
| Nested tile radius | `rounded-2xl` / `rounded-3xl` | unchanged | Already hierarchical. |
| Button pill | `rounded-4xl` | unchanged | Signature. |

### C.2 New components (all in `gather/components/ui/`)

| Component | Purpose | Notes |
|---|---|---|
| `Breadcrumb` | Trail at top of nested pages | `text-xs text-muted-foreground`, chevron separators. |
| `Toast` | Success / undo feedback | Bottom-right, `bg-card/95 backdrop-blur border border-border/70 rounded-2xl`, auto-dismiss 4s, `aria-live="polite"`. Includes "Undo" when applicable. |
| `Skeleton` | Loading placeholder | `animate-pulse bg-muted/60 rounded-2xl`. |
| `EmptyState` | Zero-data screens | Icon + title + body + one CTA. Centered inside the parent panel. |
| `Confirm` (dialog) | Destructive action gate | Radix dialog wrapped, uses `.panel` styling. |
| `VoiceStatus` | Agent state indicator | Three states: *listening* (pulsing dot), *thinking* (animated 3-dot), *speaking* (bar). The conversation's only structural UI element. |
| `CopyLink` | Share control | Input + "Copy" button; toast confirms. |
| `RelativeTime` | `<time>` wrapper | "12 min ago", updates on interval, full timestamp in `title` attr. |

### C.3 Screen redesigns (spec)

#### Consultant home (`/app`)

- Drop the "Dashboard design notes" card entirely.
- Replace 4 × `MetricCard` row with **a denser 4-up tile row**: `rounded-2xl border border-border/70 bg-background/70 p-4`, `text-xs uppercase tracking-[0.24em]` label, `text-3xl tracking-tight font-semibold` value, tiny delta chip ("+2 today").
- Add a second row: **"Needs your attention"** — stacked list of flagged sessions across all projects, each with a "Review" button.
- Active project card: keep, but add **"3 themes emerging"** chip + sparkline (Chart.js line in its own wrapper div, per `ui-design.md` canvas rule).

#### Projects list (`/app/projects`)

- Row layout: project name (left), session counts as horizontal chips (center), status + "Open" (right).
- Add **search** (`Cmd+K` focus) + **sort** dropdown (custom, per `ui-design.md`).
- Empty state when zero projects.

#### Project detail (`/app/projects/[projectId]`)

- Top strip: breadcrumb → H1 → 3 action buttons (Copy link · Preview · Re-run synthesis) all on one line.
- **Two-column body**: left (wider) = synthesis with anchored evidence; right = session queue.
- Each theme in synthesis is a click target that opens a side-drawer with the transcript segments pinned to it.
- Session row redesign: relative timestamp, split quality score (coverage · specificity), icons for flags, one-click exclude with confirm → toast + undo.

#### New project (`/app/projects/new`)

- Split into **3 visible steps** (progress dots at top), but on one scrollable page — not a multi-screen wizard.
- Step 1: Project. Step 2: What to learn (objective, topics, questions). Step 3: Guardrails (duration, identification mode).
- Live preview panel on the right at `lg:` breakpoint: renders a compact mock of what the participant will see.

#### Sign-in (`/sign-in`)

- Collapse to a single centered card (max-width 480px), not a two-panel split.
- Remove the "Auth boundaries" card.
- Use a single primary CTA: **"Continue with Google"**. Keep the magic-link form behind a feature flag only.
- Add a small footer link: "New here? See how it works →" linking back to `/`.

#### Participant entry (`/i/[linkToken]`) — single page, agent-led

- **Full-bleed single-column layout** on mobile (primary viewport). Max-w-xl on desktop.
- **Pre-start state**: hero with `consultantName`, project name, "About 15 minutes." Below it, the rewritten **"How it works"** card with three plain orientation lines and a Phosphor `ShieldCheck` icon. One primary CTA: **"Start when ready"** — full-width pill, `size="lg"`, terracotta. No secondary buttons.
- **On Start tap**: trigger `getUserMedia({ audio: true })` immediately. While the browser permission prompt is up, the page replaces the CTA area with: *"Allow microphone access to begin."* If denied, surface a recoverable error: *"We need microphone access to talk. Open your browser settings to allow it, then try again."*
- **On grant**: the realtime channel connects silently in the background. The hero card morphs into the **live conversation surface** (no page navigation):
  - `VoiceStatus` indicator — pulsing dot (listening), animated dots (thinking), bar (speaking).
  - Agent's current spoken text rendered above the indicator (last 1–2 sentences only, fades older lines).
  - Timer in the corner ("4 / ~15 min") that **only starts after the participant has said 'ready'** (or otherwise begun answering).
  - Two controls only: **Pause** and **I'm done**.
- **End**: the same surface morphs into a warm completion panel — `ShieldCheck` + "Thanks — that was genuinely useful." + "Your feedback helps improve the experience." + "You can close this tab." No IDs, no recovery tokens, no "jobs queued" language.

### C.4 Accessibility pass

- All interactive elements have visible `focus-visible:ring-[3px] ring-primary/50` (already default on buttons; extend to custom nav tiles, session rows).
- `aria-live="polite"` on the participant status region.
- `aria-invalid` + inline error text on form fields (new project).
- Relative-time elements include full timestamp in `title`.
- Verify dark-mode muted text passes WCAG AA on `--card`.
- Respect `prefers-reduced-motion` on `VoiceStatus` pulse and skeleton `animate-pulse`.

---

## D. Micro-interactions & Trust Signals

1. **Realtime provisioning** — replace opaque "Creating your session…" with quiet labelled progress.
2. **Auto-save transcript events** — a quiet "Saved" ghost-toast in the corner every time a segment lands server-side. Consultant side, not participant.
3. **Exclusion is reversible** — every exclude action fires a 6-second toast with "Undo."
4. **Synthesis freshness pill** — "Updated 3 min ago" next to the synthesis title; click = re-run.
5. **Evidence chips** — every synthesis bullet gets a `[quote]` chip; click opens a side-drawer with the exact transcript segment. Single most important trust signal.
6. **Session completion sound** — very soft acknowledgment chime on participant completion (toggleable, respects `prefers-reduced-motion`, starts muted).

---

## E. Files to Modify

### Copy-only (no structural change)

- `gather/app/page.tsx`
- `gather/app/sign-in/page.tsx`
- `gather/app/app/page.tsx`
- `gather/app/app/projects/page.tsx`
- `gather/app/app/projects/new/page.tsx`
- `gather/app/app/projects/[projectId]/page.tsx`
- `gather/app/i/[linkToken]/page.tsx`
- `gather/components/dashboard/app-shell.tsx`
- `gather/components/marketing/magic-link-form.tsx`

### Component edits

- `gather/components/dashboard/metric-card.tsx` — tighter sizing, new delta chip slot, drop hardcoded "Live" badge.
- `gather/components/participant/interview-shell.tsx` — major rewrite: single-page agent-led flow, hide IDs, VoiceStatus, warm end screen.
- `gather/components/ui/card.tsx` — accept optional tighter `density="compact"` prop.

### New components (all in `gather/components/ui/`)

- `breadcrumb.tsx`
- `toast.tsx` (+ `toaster.tsx` provider; wire into `app/layout.tsx`)
- `skeleton.tsx`
- `empty-state.tsx`
- `confirm.tsx`
- `voice-status.tsx`
- `copy-link.tsx`
- `relative-time.tsx`

### New docs

- `docs/voice-and-tone.md` — source of truth for copy voice, banned words, CTA verb table.

### Style additions

- `gather/app/globals.css` — add utility `.tile` (`rounded-2xl border border-border/70 bg-background/70 p-4`) to reduce repetition across new dashboard tiles.

---

## F. Sequencing (rollout order)

1. **Copy pass** — highest value, lowest risk. Touches only `.tsx` strings in existing files.
2. **New UI primitives** — Breadcrumb, Toast, Skeleton, EmptyState, Confirm, VoiceStatus, CopyLink, RelativeTime.
3. **Participant flow redesign** — uses `VoiceStatus`. Most important user to get right.
4. **Consultant dashboard density + evidence drawer** — applies primitives; delivers the "senior colleague" feel.
5. **Accessibility + motion-reduce + contrast verify**.

---

## G. Verification

1. **Visual QA**: `npm --prefix gather run dev`, walk both flows end-to-end in Chrome at 375px, 768px, 1280px. Toggle light/dark with the `d` hotkey.
2. **Copy QA**: grep for every banned word (`scaffold|MVP|WebRTC|credentials|transport|bootstrap|job queue|RLS|metadata prompts`). Zero hits in `app/` and `components/` outside comments.
3. **Participant dry-run**: complete a session in demo mode with devtools throttled to Fast 3G. Confirm loading states appear, no ID leaks, end screen is warm.
4. **Consultant dry-run**: create project → share link → review flagged session → exclude → undo → re-run synthesis → click an evidence chip. Each action produces visible feedback within 150ms.
5. **a11y**: keyboard-only navigation works end-to-end (Tab order, focus rings, `aria-live` announces status).
6. **Types / lint / build**: `npm --prefix gather run typecheck && npm --prefix gather run lint && npm --prefix gather run build`.
7. **Docs drift**: `npm run docs:check` still passes.

---

## H. Confirmed Decisions

- **Scope**: everything end-to-end (copy + IA + primitives + participant flow + density + a11y).
- **Evidence reveal**: side-drawer pattern on the project synthesis page.
- **Participant flow**: single page, agent-led. The voice agent narrates the opener and waits for "ready" before starting the timer and the must-ask questions. No staged UI, no dedicated mic-check screen — `getUserMedia` fires on Start, and the agent's opening line doubles as the channel test.
- **Greeting**: generic and friendly ("Welcome back."). No name capture.
