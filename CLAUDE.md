<!-- GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: docs/agent-guide.md -->
<!-- Regenerate with: npm run docs:sync -->

# CLAUDE

## Canonical Docs
- [PRD v1](docs/prd-v1.md) - Product requirements, scope, goals, and release criteria.
- [Issue Log](docs/issue-log.md) - Confirmed repo-specific failures, root causes, and prevention checks.
- [Technical Spec v1](docs/technical-spec-v1.md) - Implementation architecture, interfaces, data model, and delivery slices.
- [Decision Log](docs/decision-log.md) - Locked product and technical defaults for MVP.
- [Agent Guide Source](docs/agent-guide.md) - Human-maintained source used to generate this file.

# GatherAI Agent Guide

## Scope
- Treat the repository root as the governance layer and `gather/` as the only application.
- Do not recreate `next-app/` or a nested git repo inside `gather/`.
- Do not add a standalone Codex skill in v1. Use this document set as the progressive-disclosure system.

## Canonical Paths
- Application: `gather/`
- Database and queue schema: `gather/supabase/migrations/`
- Public participant routes: `gather/app/i/[linkToken]` and `gather/app/api/public/...`
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
- Always consult [`STYLE_GUIDE.md`](STYLE_GUIDE.md) before changing styles, adding components, or building new screens. Match its color tokens, typography rules, spacing, radii, translucency patterns, and component conventions.
- Always consult [`ui-design.md`](ui-design.md) before producing any UI design mockup. Follow its output format, typography, icon, component, and interaction rules.

## Architecture Guardrails
- Consultant data is authenticated through Supabase Auth and isolated with RLS.
- Public participant traffic never talks directly to Supabase with elevated privileges; it goes through Next.js route handlers.
- Browser and SSR clients use Supabase publishable keys; server-only workflows use the Supabase secret key.
- Transcript storage is text-only. Do not introduce audio persistence in v1.
- Generated outputs and consultant overrides remain separate records. Never overwrite raw generated artifacts.
- The interview loop is hybrid: application state owns coverage, timing, and stop conditions; the realtime model owns phrasing and follow-up generation.
- MVP ships `strict` mode first. `adaptive` stays behind a future flag.

## When More Context Is Needed
- Product ambiguity: read the PRD.
- Interface or data-shape ambiguity: read the technical spec and shared types.
- Decision ambiguity: read the decision log before inventing a new default.
- Similar bug, setup, auth, theme, build, or bootstrap failure: read the issue log before re-diagnosing from scratch.
- If a code change invalidates the docs, update the docs in the same change and regenerate the generated agent docs.
