# Decision Log

Last updated: April 29, 2026 (D-024 workspace in-motion semantics)

## Locked Decisions

### D-001 Repo shape

- Status: accepted
- Decision: keep `gather/` as the canonical app and use the repository root for docs, governance, and automation.
- Consequence: `next-app/` is removed from scope, and `gather/.git` must not exist.

### D-002 AGENTS maintenance

- Status: accepted
- Decision: `AGENTS.md` is generated from `docs/agent-guide.md` and checked for drift in CI and pre-commit.
- Consequence: engineers update the source docs, not `AGENTS.md` directly.

### D-003 Auth and tenancy

- Status: accepted
- Decision: consultants use Supabase Auth with Google OAuth for v1. Email-only sessions are rejected even if legacy email auth users or workspace memberships exist. Each consultant has exactly one workspace in v1.
- Consequence: collaborator accounts and multi-user tenant administration are out of scope. Google OAuth callback provisioning creates the consultant workspace idempotently, while the auth trigger only maintains profile rows.

### D-004 Participant identity

- Status: accepted
- Decision: participants do not authenticate. Sessions are accessed by opaque public link tokens plus signed session recovery tokens.
- Consequence: recovery is browser and URL based rather than account based.

### D-005 Interview mode rollout

- Status: accepted
- Decision: ship `strict` mode only in MVP.
- Consequence: the state machine and coverage logic optimize for guaranteed question coverage first.

### D-006 Session recovery

- Status: accepted
- Decision: resume is allowed for 24 hours after last activity using a signed session token in the URL plus local browser recovery state.
- Consequence: after the window expires, the participant must restart cleanly.

### D-007 Synthesis execution

- Status: accepted
- Decision: run synthesis automatically after each completed interview and allow manual refresh.
- Consequence: consultant exclusions and overrides must be respected on every regeneration.

### D-008 Async jobs

- Status: accepted
- Decision: use a Supabase-backed job queue with SQL claim/retry logic and Vercel Cron recovery sweeps.
- Consequence: do not depend on Vercel Workflow beta for MVP delivery.

### D-009 Dashboard scope

- Status: accepted
- Decision: drop `total invited/shared` from the MVP dashboard because the product does not manage invitations.
- Consequence: the dashboard focuses on in-progress, completed, abandoned, quality flags, recent activity, and emerging themes.

### D-010 Evidence model

- Status: accepted
- Decision: every major generated claim stores transcript evidence references by `session_id` and `segment_id`.
- Consequence: raw generations remain immutable, and consultant edits are represented as overrides.

### D-011 Storage policy

- Status: accepted
- Decision: store transcript text only, not audio.
- Consequence: consent copy, schema, and UI must consistently avoid implying audio retention.

### D-012 Model/runtime stance

- Status: accepted
- Decision: browser voice uses OpenAI Realtime over WebRTC with server-minted ephemeral client secrets.
- Consequence: realtime session minting stays server-side, and browser code must not expose project API keys.

### D-013 Supabase key model

- Status: accepted
- Decision: standardize on Supabase publishable keys for browser and SSR clients, secret keys for server-only operations, and keep the Supabase access token limited to setup tooling.
- Consequence: the app environment contract uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `SUPABASE_ACCESS_TOKEN`; legacy `anon` and `service_role` key names are out of scope for v1.

### D-014 Participant interviewer identity and start gate

- Status: accepted
- Decision: the participant-facing interviewer is named `Mia` in v1, she speaks first after the realtime session connects, and the interview timer starts only after a soft readiness signal such as "ready", "yes", "okay", or a substantive first answer.
- Consequence: participant runtime instructions, status UI, and persisted runtime state must distinguish intro delivery from the timed interview start.

### D-015 Structured analysis model split

- Status: accepted
- Decision: session grounding and narrative extraction use `gpt-5.4-mini` by default, quality grading uses `gpt-5.4-nano`, and project synthesis plus hard-session escalation use `gpt-5.4`, all through structured Responses API calls with validated evidence refs.
- Consequence: the runtime environment contract includes dedicated grounding, enrichment, grader, escalation, and project synthesis model variables, and generated outputs must not fall back to placeholder rows when structured extraction is unavailable.

### D-016 Dual-mode project flow

- Status: accepted
- Decision: keep `discovery` and `feedback` in the shared schema and runtime, but position the product around `feedback`; discovery creation stays behind a feature flag and is disabled by default.
- Consequence: `project_type` remains immutable, existing discovery projects stay readable, normal project setup defaults to feedback while testimonials are available as a separate choice, and participant framing plus runtime guidance must not assume a specific event type or delivery format for feedback projects.

### D-017 Project shell identity

- Status: accepted
- Decision: remove `client_name` from the top-level project record and use `project.name` as the single required project identifier.
- Consequence: project create/edit flows, repository types, prompts, and schema no longer depend on a separate client field.

### D-018 Testimonial workflow

- Status: accepted
- Decision: add `testimonial` as a first-class project type for short voice-to-text reviews, moderated approvals, and iframe embeds.
- Consequence: testimonial capture uses `/t/[linkToken]`, stores submitted transcript text only, keeps audio as temporary request data for transcription, and does not use Mia, realtime interviews, analysis jobs, or synthesis.

### D-019 Visual system replacement (Studio cream/clay)

- Status: accepted
- Decision: replace the previous frosted-glass + Montserrat + terracotta system with a warm cream + clay paper-notebook system. Body and headings use Instrument Serif, handwritten margin notes use Caveat, sans labels use Inter Tight, micro-eyebrows use JetBrains Mono. Tactile ornaments — masking tape, rubber stamps, pushpins, sticky notes, scribble underlines — are first-class primitives. Dark mode is dropped in v1; the system is light-only. The visible wordmark is `gather.` (Caveat lowercase + clay dot); repo, package, env var, and database identifiers stay `GatherAI`.
- Consequence: `STYLE_GUIDE.md` is rewritten to describe the new system; `ui-design.md` is amended so future mockups produced by the design assistant follow it. `gather/app/globals.css`, `gather/app/layout.tsx`, every `gather/components/ui/*` primitive, and every page under `gather/app/{,app,i,t,embed,sign-in}/` are reskinned in one sweep. `ThemeProvider`, `ThemeBootstrap`, the `d` hotkey, and `gather/lib/theme/shared.ts` are removed. New primitives `<Wordmark>`, `<AppBar>`, `<Crumb>`, `<Field>`, `<EvidenceDrawer>` and ornament components (`Tape`, `Stamp`, `Pin`, `Scribble`, `WaveBars`, `MicRing`, `Spectrogram`, `StickyNote`) live under `gather/components/ui/`. Legacy Badge variants (`accent`, `success`, `warning`, `danger`) remain as aliases for `clay`, `sage`, `gold`, `rose`. Reintroducing dark mode is a future decision.

### D-020 Google-only consultant auth

- Status: accepted
- Decision: open consultant signup means open Google OAuth signup only. Supabase Email auth is disabled by bootstrap in OAuth mode, magic-link requests must not create users, and RLS helpers require a Google provider claim.
- Consequence: existing email-only rows remain in the database but cannot access consultant data. Accounts with both email and Google providers remain valid because their provider list includes Google.

### D-021 Design fidelity bar

- Status: accepted
- Decision: every UI surface aligns to the Studio cream/clay design at `gather/project/final/` within ±2px on type and exact-match on ornament positions, copy, and grid templates. Page paddings live in pages, not the app shell — `<AppShell>` renders only the sticky `<AppBar>`; each page sets its own `<div style={{ padding, maxWidth, margin: '0 auto' }}>` outer container. New utilities and components: `.section-head`, `<MarginNote>`, the shared `<Completion>` screen, and `<NotebookCard>` / `<SidebarRail>` / `<NotebookControls>` / `<PreStartCard>` for the interview surface.
- Consequence: deep interview becomes a notebook (two tapes, scribble Q heading, two-column transcript with rotated Caveat speaker tags, inline live wave row, MarginNote for highlights, right rail with project context + today's questions checklist + anonymity disclaimer). Synthesis adds a 7-col "Who we talked to" session grid above the themes/quotes/contradictions block. Feedback flow gains a footer skip link and routes its submitted state into `<Completion>` (sage stamp, 78px headline, Caveat "— really.", dot grid, sticky note). `STYLE_GUIDE.md` becomes the exhaustive 12-section spec — type scale, layout primitives, page recipes, ornament positions, copy library — such that any agent can rebuild the design from the doc alone. `ui-design.md` is amended with a drop-in `<style>` block reproducing all tokens and ornament classes verbatim.

### D-022 Project archive lifecycle

- Status: accepted
- Decision: project deletion is a two-stage lifecycle. The project-card X archives active projects after confirmation; archived projects are available at `/app/projects?filter=archived`, can be restored, and can be permanently deleted from the archive after confirmation. Delete-all archived is scoped to the authenticated consultant workspace.
- Consequence: active workspace lists exclude archived projects, archive is reversible, and permanent deletion relies on existing `on delete cascade` relationships. Archived participant and testimonial capture links stop working immediately, including active-session resume/event/client-secret paths. Testimonial embeds keep rendering approved reviews while archived but hide the leave-review CTA until the project is restored.

### D-023 Per-page consultant chrome

- Status: accepted
- Decision: every consultant page renders its own `<ConsultantAppBar>` at the top, with a full breadcrumb reflecting actual navigation depth and a right slot for page-level status/actions. The `app/app/layout.tsx` no longer paints any chrome — it only enforces the auth gate and supplies a `ConsultantSessionProvider` so child pages can render the avatar and Sign-out form through `<ConsultantAppBar>`. The session review page no longer has a separate `<ReviewActionBar>`; its breadcrumb (Workspace / project / respondent) lives in the AppBar and its status pill + overflow menu live in the AppBar's right slot.
- Consequence: `gather/components/dashboard/app-shell.tsx` and `gather/components/review/review-action-bar.tsx` are deleted. Status controls move to `gather/components/review/review-status-controls.tsx`. Sticky sibling rail and transcript aside on the session review page anchor to `calc(var(--app-bar-height) + 24px)`. There is exactly one chrome bar per consultant page; the breadcrumb deepens with route depth instead of forcing a second sticky row to repaint navigation.

### D-024 Workspace in-motion semantics

- Status: accepted
- Decision: workspace `In motion` means unresolved work or fresh activity, not only live sessions. Testimonial projects stay in motion while any review is `pending`; otherwise testimonial activity, feedback/discovery completed-session activity, and project edits age out after a rolling 7 × 24 hour window.
- Consequence: the workspace home screen derives motion state from existing project, session, testimonial review, and testimonial link timestamps. No new schema is required, and pending testimonial moderation cannot disappear into `Quiet for now` because of age alone.

## Reference Notes

- OpenAI Realtime docs describe WebRTC as ideal for browser and client-side interactions and document server-side controls for realtime sessions.
- OpenAI Agents SDK voice quickstart documents browser `RealtimeSession` using WebRTC by default.
- Supabase RLS docs state browser data access is safe when RLS is enabled and combined with Supabase Auth.
- Braintrust docs support online scoring rules for production logs, and the pricing page confirms a free starter tier with included scores.
