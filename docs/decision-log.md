# Decision Log

Last updated: April 28, 2026 (D-020 Google-only consultant auth)

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
- Consequence: `project_type` remains immutable, existing discovery projects stay readable, normal project setup defaults to feedback while testimonials are available as a separate choice, and participant framing plus runtime guidance must not assume workshop language for feedback projects.

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

## Reference Notes

- OpenAI Realtime docs describe WebRTC as ideal for browser and client-side interactions and document server-side controls for realtime sessions.
- OpenAI Agents SDK voice quickstart documents browser `RealtimeSession` using WebRTC by default.
- Supabase RLS docs state browser data access is safe when RLS is enabled and combined with Supabase Auth.
- Braintrust docs support online scoring rules for production logs, and the pricing page confirms a free starter tier with included scores.
