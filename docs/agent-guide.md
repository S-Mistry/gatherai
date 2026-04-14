# GatherAI Agent Guide

## Scope
- Treat the repository root as the governance layer and `gather/` as the only application.
- Do not recreate `next-app/` or a nested git repo inside `gather/`.
- Do not add a standalone Codex skill in v1. Use this document set as the progressive-disclosure system.

## Canonical Paths
- Application: `gather/`
- Database and queue schema: `gather/supabase/migrations/0001_mvp_schema.sql`
- Public participant routes: `gather/app/i/[linkToken]` and `gather/app/api/public/...`
- Consultant surfaces: `gather/app/app/...`
- Shared domain types: `gather/lib/domain/types.ts`

## Context Loading Order
1. Read this `AGENTS.md` file first.
2. Read [`docs/technical-spec-v1.md`](docs/technical-spec-v1.md) for implementation details.
3. Read [`docs/decision-log.md`](docs/decision-log.md) for locked defaults and non-negotiable assumptions.
4. Read [`docs/prd-v1.md`](docs/prd-v1.md) when product intent, scope, or acceptance criteria need clarification.
5. Read only the app files relevant to the slice being changed.

## Command Map
- Root docs sync: `npm run docs:sync`
- Root docs drift check: `npm run docs:check`
- Install repo hook: `npm run hooks:install`
- App install: `npm --prefix gather install`
- App dev server: `npm --prefix gather run dev`
- App typecheck: `npm --prefix gather run typecheck`
- App lint: `npm --prefix gather run lint`
- App build: `npm --prefix gather run build`

## Change Protocol
- Any change to routes, schema, workflows, core architecture, or the context-loading order must update the relevant file in `docs/`.
- Update `docs/agent-guide.md` whenever the AGENTS instructions themselves need to change.
- After changing any doc that affects agent instructions, run `npm run docs:sync`.
- Before finalizing work, run `npm run docs:check`.

## Architecture Guardrails
- Consultant data is authenticated through Supabase Auth and isolated with RLS.
- Public participant traffic never talks directly to Supabase with elevated privileges; it goes through Next.js route handlers.
- Transcript storage is text-only. Do not introduce audio persistence in v1.
- Generated outputs and consultant overrides remain separate records. Never overwrite raw generated artifacts.
- The interview loop is hybrid: application state owns coverage, timing, and stop conditions; the realtime model owns phrasing and follow-up generation.
- MVP ships `strict` mode first. `adaptive` stays behind a future flag.

## When More Context Is Needed
- Product ambiguity: read the PRD.
- Interface or data-shape ambiguity: read the technical spec and shared types.
- Decision ambiguity: read the decision log before inventing a new default.
- If a code change invalidates the docs, update the docs in the same change and regenerate `AGENTS.md`.
