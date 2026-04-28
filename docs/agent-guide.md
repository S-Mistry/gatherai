# GatherAI Agent Guide

## Scope

- Treat the repository root as the governance layer and `gather/` as the only application.
- Do not recreate `next-app/` or a nested git repo inside `gather/`.
- Do not add a standalone Codex skill in v1. Use this document set as the progressive-disclosure system.

## Canonical Paths

- Application: `gather/`
- Database and queue schema: `gather/supabase/migrations/`
- Public participant routes: `gather/app/i/[linkToken]` and `gather/app/api/public/...`
- Public testimonial routes: `gather/app/t/[linkToken]`, `gather/app/embed/testimonials/[projectId]`, and `gather/app/api/public/testimonials/...`
- Consultant surfaces: `gather/app/app/...`
- Shared domain types: `gather/lib/domain/types.ts`

## Context Loading Order

1. Read this generated agent guide first.
2. Read [`docs/issue-log.md`](docs/issue-log.md) for confirmed past failures and prevention checks.
3. Read [`docs/technical-spec-v1.md`](docs/technical-spec-v1.md) for implementation details.
4. Read [`docs/decision-log.md`](docs/decision-log.md) for locked defaults and non-negotiable assumptions.
5. Read [`docs/prd-v1.md`](docs/prd-v1.md) when product intent, scope, or acceptance criteria need clarification.
6. Read only the app files relevant to the slice being changed.

## Command Map

- Root docs sync: `npm run docs:sync`
- Root docs drift check: `npm run docs:check`
- Install repo hook: `npm run hooks:install`
- App install: `npm --prefix gather install`
- App Supabase bootstrap: `npm --prefix gather run supabase:bootstrap`
- App analysis evals: `npm --prefix gather run analysis:eval`
- App analysis fixture seed: `npm --prefix gather run analysis:seed`
- App dev server: `npm --prefix gather run dev`
- App typecheck: `npm --prefix gather run typecheck`
- App lint: `npm --prefix gather run lint`
- App build: `npm --prefix gather run build`

## Change Protocol

- Any change to routes, schema, workflows, core architecture, or the context-loading order must update the relevant file in `docs/`.
- Update `docs/agent-guide.md` whenever the generated agent instructions themselves need to change.
- When a real issue is diagnosed and fixed with a clear prevention rule, add it to [`docs/issue-log.md`](docs/issue-log.md) in the same change.
- After changing any doc that affects agent instructions, run `npm run docs:sync`.
- Before finalizing work, run `npm run docs:check`.

## UI Work

- Always consult [`STYLE_GUIDE.md`](STYLE_GUIDE.md) before changing styles, adding components, or building new screens. Match its color tokens, type scale, page recipes, ornament conventions (Tape, Stamp, Pin, Scribble, WaveBars, MicRing, Spectrogram, StickyNote, MarginNote), and copy library.
- Always consult [`ui-design.md`](ui-design.md) before producing any UI design mockup. Follow its output format, the drop-in `<style>` block, the Caveat phrase library, and component vocabulary.
- The reference design is `gather/project/final/` in the design archive. When refactoring or adding a UI surface, port the exact paddings, grid templates, and copy strings rather than approximating them — the bar is ±2px on type and exact-match on ornament positions, copy, and grid templates.
- Each page owns its own outer `<div style={{padding, maxWidth, margin: '0 auto'}}>` container. `<AppShell>` only renders the sticky `<AppBar>`. See `STYLE_GUIDE.md` §6.2 for canonical paddings (Dashboard 1280, Synthesis 1320, DeepInterview 1320, FeedbackInterview 760, Completion 640).
- The visible wordmark is `gather.` (Caveat lowercase + clay dot). Repository, package, env var, and database identifiers stay `GatherAI`.
- Dark mode is dropped in v1. Do not add `.dark` styles, `dark:` Tailwind variants, or theme toggles. The system is light-only.
- Headings stay at `font-weight: 400` — never bold. The italic-clay one-word accent in a serif headline is the signature move; use it once per hero.
- One `<Stamp>` per page max. One `<Tape>` per card max (exception: DeepInterview has two). One `<Scribble>` per heading max.

## Architecture Guardrails

- Consultant data is authenticated through Supabase Auth with Google OAuth and isolated with RLS.
- Email-only consultant sessions must fail closed in app code and RLS, even when legacy email-auth users or workspace memberships exist.
- Public participant traffic never talks directly to Supabase with elevated privileges; it goes through Next.js route handlers.
- Browser and SSR clients use Supabase publishable keys; server-only workflows use the Supabase secret key.
- `feedback` and `testimonial` are visible creation paths. `discovery` remains feature-flagged for legacy or experimental use.
- Transcript and testimonial review storage is text-only. Do not introduce audio persistence in v1; testimonial audio is temporary request data for transcription only.
- Generated outputs and consultant overrides remain separate records. Never overwrite raw generated artifacts.
- The interview loop is hybrid: application state owns coverage, timing, and stop conditions; the realtime model owns phrasing and follow-up generation.
- Testimonials do not use the realtime interview loop, Mia, analysis jobs, or synthesis. They use simple recording, transcription, editable text, star rating, moderation, and embed rendering.
- MVP ships `strict` mode first. `adaptive` stays behind a future flag.

## When More Context Is Needed

- Product ambiguity: read the PRD.
- Interface or data-shape ambiguity: read the technical spec and shared types.
- Decision ambiguity: read the decision log before inventing a new default.
- Similar bug, setup, auth, theme, build, or bootstrap failure: read the issue log before re-diagnosing from scratch.
- If a code change invalidates the docs, update the docs in the same change and regenerate the generated agent docs.
