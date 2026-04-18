# Technical Spec v1

Last updated: April 16, 2026

## 1. Scope

- This spec implements the AI Workshop Discovery Interviewer MVP.
- The repository root owns governance, docs, and repo automation.
- The `gather/` Next.js app owns all product code.

## 2. Verified platform assumptions

- OpenAI Realtime API supports WebRTC for browser and client-side interactions and exposes server-side controls: https://developers.openai.com/api/docs/guides/realtime
- OpenAI Agents SDK voice quickstart shows `RealtimeSession` using WebRTC in the browser and a server-minted client secret flow: https://openai.github.io/openai-agents-js/guides/voice-agents/quickstart/
- Supabase recommends enabling RLS for exposed schemas and combining it with Supabase Auth: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel Functions are the server execution surface for Next.js route handlers and API endpoints: https://vercel.com/docs/functions
- Vercel Cron Jobs provide scheduled recovery sweeps: https://vercel.com/docs/cron-jobs
- Vercel Workflow is available on all plans but remains beta, so it is intentionally not the MVP dependency: https://vercel.com/docs/workflow
- Braintrust supports online scoring rules for production logs and has a free starter tier: https://www.braintrust.dev/docs/evaluate/write-scorers and https://www.braintrust.dev/pricing

## 3. System architecture

### 3.1 Applications

- Root workspace:
  - docs and governance automation
  - generated `AGENTS.md`
  - CI and git hooks
- `gather/`:
  - Next.js App Router UI
  - public participant routes
  - consultant app routes
  - server actions and route handlers
  - Supabase integration helpers
  - Supabase-backed repository layer for consultant, participant, and job flows
  - realtime voice integration helpers

### 3.2 Runtime topology

- Participant path:
  - browser loads `/i/[linkToken]`
  - page creates or resumes a participant session through a public route handler
  - route handler validates the link token, creates or resumes the session, and returns a signed recovery token plus session metadata
  - browser requests an OpenAI realtime client secret from a server route
  - browser connects to OpenAI Realtime over WebRTC
  - the realtime session explicitly triggers Mia's opening response so the participant does not need to speak first
  - participant runtime persists intro, readiness, pause, resume, and completion state updates alongside transcript items
  - the timed interview starts only after a soft readiness signal or a substantive first answer
  - browser subscribes to realtime history updates and persists completed participant and agent transcript items back to public route handlers
  - transcript ingest uses stable realtime source item IDs so reconnects and retry flushes stay idempotent
- Consultant path:
  - browser loads `/sign-in`
  - page starts Supabase Google OAuth by default or exposes the magic-link fallback when the deploy-time auth flag enables it
  - Supabase redirects back through `/auth/callback`, which exchanges the auth code and establishes the consultant session
  - browser loads `/app/...`
  - server components and server actions fetch consultant-scoped data from Supabase
  - the project synthesis surface lazily resolves transcript-backed evidence in a right-side drawer through an authenticated consultant read route
  - RLS restricts reads and writes to the consultant workspace
- Analysis path:
  - session completion enqueues transcript cleaning, extraction, and quality scoring jobs
  - transcript cleaning is deterministic: normalize whitespace, preserve speaker order, merge consecutive same-speaker fragments when safe, and mark low-signal greeting or channel-check turns for downstream analysis
  - session extraction is a staged pipeline:
    - grounding pass extracts question-level coverage, verbatim quote candidates, and insight candidates with exact participant evidence refs
    - narrative pass consumes only grounded artifacts to write summary, workshop implications, recommended actions, and unresolved questions
    - hard sessions may escalate to a larger synthesis-grade model when the grounding pass is too thin for the available transcript
  - session outputs are append-only generated runs; read paths resolve the latest successful run and layer consultant overrides on top
  - quality scoring combines deterministic structural checks with a cheap model-assisted faithfulness and workshop-usefulness pass, while manual consultant quality overrides remain separate from generated scores
  - the completion route immediately claims and processes that session's queued jobs in deterministic order, then enqueues and runs project synthesis
  - project synthesis uses only completed, non-excluded effective session outputs, consumes the latest generated run per session, and rejects claims without valid cited evidence
  - internal dispatch routes and cron sweeps remain recovery paths for queued or stuck jobs
  - Braintrust traces and online scores are stored asynchronously

## 4. Routes and APIs

### 4.1 Public routes

- `/`
  - marketing overview and entry into consultant sign-in
- `/sign-in`
  - consultant sign-in surface, using Google OAuth by default with a feature-flagged magic-link fallback
- `/auth/login`
  - starts consultant Supabase OAuth and validates the requested provider/redirect target
- `/auth/callback`
  - exchanges the Supabase auth code and redirects into the consultant app
- `/i/[linkToken]`
  - participant disclosure, metadata collection, interview shell, resume/completion states

### 4.2 Consultant routes

- `/app`
  - workspace dashboard
- `/app/projects`
  - project list, with optional `filter=live|completed|needs-review` dashboard drill-down
- `/app/projects/new`
  - project creation
- `/app/projects/[projectId]`
  - project dashboard, config summary, version history, synthesis, sessions
- `/app/projects/[projectId]/sessions/[sessionId]`
  - transcript-backed review and override surface

### 4.3 Public APIs

- `POST /api/public/links/[linkToken]/sessions`
  - create a participant session for a valid public link
- `POST /api/public/sessions/[sessionId]/resume`
  - resume a session using the signed recovery token
- `POST /api/public/sessions/[sessionId]/client-secret`
  - mint an OpenAI realtime client secret after validating session eligibility
- `POST /api/public/sessions/[sessionId]/events`
  - ingest transcript segments plus runtime state changes such as intro delivered, readiness detected, and pause or resume, keyed by optional realtime source item IDs for idempotent persistence
- `POST /api/public/sessions/[sessionId]/complete`
  - finalize the session, persist final elapsed interview timing, enqueue downstream session analysis jobs, and trigger immediate session-scoped dispatch

### 4.4 Consultant read APIs

- `GET /api/projects/[projectId]/evidence?kind=theme|contradiction|notable_quote&claimId=...`
  - validate consultant auth and workspace access, resolve the selected synthesis claim, and return exact cited transcript excerpts plus respondent labels and session-review links for the project evidence drawer

### 4.5 Internal APIs

- `POST /api/internal/jobs/dispatch`
  - claim and process a bounded set of queued jobs
- `GET /api/internal/cron/analysis-recovery`
  - cron-triggered recovery sweep guarded by `CRON_SECRET`

### 4.6 Consultant server actions

- project create/update/version
- project create bootstraps the project row, initial config version, and initial public link atomically
- session include/exclude toggle
- session claim suppress/restore
- session quality override
- session output override save
- project synthesis override save
- manual synthesis refresh

## 5. Shared domain model

### 5.1 Core types

- `ProjectConfigVersion`
  - immutable configuration snapshot used by one or more sessions
- `PublicInterviewConfig`
  - safe participant-facing subset of project configuration
- `ParticipantSession`
  - public session record pinned to one `project_config_version_id`
- `SessionRuntimeState`
  - current question pointer, intro and readiness lifecycle markers, elapsed interview timing, novelty signals, pause state, and completion state
- `TranscriptSegment`
  - one ordered utterance from `participant`, `agent`, or `system`, with an optional stable realtime source item ID
- `EvidenceRef`
  - claim provenance linking `sessionId` and `segmentIds`
- `SessionOutputGenerated`
  - immutable generated extraction artifact containing cleaned transcript text, question reviews, quote library items, insight cards, and narrative outputs
- `SessionOutputOverride`
  - consultant-written corrections or suppressions
- `SessionQualityOverride`
  - consultant-written override for the effective low-quality flag and review note
- `ProjectSynthesisGenerated`
  - immutable synthesis artifact
- `ProjectEvidenceClaimKind`
  - discriminant for project-level evidence drawer claims: `theme`, `contradiction`, or `notable_quote`
- `ProjectEvidenceDrawerPayload`
  - authenticated project-level evidence response containing selected claim metadata, evidence counts, and resolved excerpts
- `ProjectEvidenceExcerpt`
  - one resolved evidence card with respondent label, rationale, cited segment IDs, and a session-review link
- `ProjectEvidenceSegment`
  - one exact resolved transcript segment rendered inside a project-level evidence excerpt
- `ProjectSynthesisOverride`
  - consultant-written synthesis changes
- `QualityScore`
  - per-session quality dimensions and flag state
- `AnalysisJob`
  - queue record for transcript cleaning, extraction, scoring, or synthesis

### 5.2 Data invariants

- Every participant session stores the exact `project_config_version_id` used when the interview started.
- Raw transcript segments are append-only.
- Transcript persistence is idempotent by `session_id + source_item_id` when a realtime source item ID is present.
- Generated artifacts are immutable.
- Session extraction runs are append-only; UI and synthesis consume the latest run for each session.
- Overrides are layered separately and merged at read time.
- Manual quality overrides never overwrite generated quality score rows.
- Evidence references are required for major generated claims.

## 6. Interview runtime

### 6.1 State machine

- `pre_start`
- `consent`
- `metadata_collection`
- `intro`
- `question_active`
- `follow_up`
- `question_summary_confirm`
- `question_advance`
- `wrap_up`
- `paused`
- `complete`
- `abandoned`

### 6.2 Application-owned controls

- required question queue
- current question index
- follow-up count
- per-question elapsed time
- interview elapsed time
- repetition and novelty counters
- summary-confirm checkpoint
- hard-stop enforcement at duration cap
- resume eligibility window

### 6.3 Model-owned behavior

- phrasing of questions and follow-ups
- vague-answer challenge wording
- participant-friendly summarization
- conversational repair and acknowledgement

### 6.4 Default heuristics

- ask one core question at a time
- allow two follow-ups by default
- exceed two follow-ups only if novelty remains high and there is time budget remaining
- move on when the participant signals completion, novelty drops, time threshold is hit, or coverage confidence is high enough
- end the session at the configured duration cap even if some questions remain

## 7. Supabase schema

### 7.1 Tables

- `profiles`
- `workspaces`
- `workspace_members`
- `projects`
- `project_config_versions`
- `project_public_links`
- `participant_sessions`
- `transcript_segments`
- `session_outputs_generated`
- `session_output_overrides`
- `project_syntheses_generated`
- `project_synthesis_overrides`
- `quality_scores`
- `analysis_jobs`
- `prompt_versions`
- `model_versions`
- `audit_logs`

### 7.2 Queue model

- jobs are inserted with `status = 'queued'`
- workers claim jobs via SQL function using `FOR UPDATE SKIP LOCKED`
- route handlers call public RPC wrappers that delegate to `app.claim_analysis_jobs` and `app.release_stale_analysis_jobs`
- session completion also uses a session-scoped dispatch path so the respondent review is populated immediately after completion
- retries increment `attempt_count` and set `next_attempt_at`
- cron sweeps reclaim stuck `processing` jobs whose lock has expired
- synthesis refresh jobs are deduplicated per project and config generation window where possible

## 8. Security model

- All consultant-owned tables use RLS.
- Public participant access never uses the server secret key in the browser.
- Server secret key access exists only in route handlers, background job execution, and setup tooling.
- RLS helper functions run as security definers so workspace-access checks do not recurse through protected tables.
- Consultant-authenticated RPCs and RLS checks that call `app.*` helpers require explicit schema grants; the `authenticated` role must retain `USAGE` on schema `app`.
- Public links are opaque random tokens.
- Session recovery tokens are signed, scoped to one session, and expire after 24 hours.
- Invalid, revoked, or expired public links fail closed.

## 9. Braintrust integration

- Each completed session logs a trace containing the transcript, generated outputs, model/prompt provenance, and session metadata.
- Online scorers evaluate production traces asynchronously.
- Quality scores are imported into `quality_scores` without blocking participant completion or consultant page loads.

## 10. UX surfaces

### 10.1 Consultant UX

- signal-first dashboard
- zero-project dashboard empty state with a single CTA to create the first project
- projects list with status chips
- project detail with config version history, session table, quality flags, and synthesis summary
- session review page with evidence-backed claims and editable overrides
- session review page distinguishes transcript and analysis `pending`, `failed`, and `ready` states instead of showing placeholder copy as persisted content

### 10.2 Participant UX

- one-click entry from the public link
- concise disclosure before microphone access
- optional metadata collection driven by config
- clear session length expectation
- Mia speaks first with a short disclosure and readiness prompt
- timer starts only after the participant indicates they are ready or begins substantively
- live status uses an event-driven waveform that distinguishes listening, thinking, and speaking
- microphone permission error state
- paused, resumed, and completed states

## 11. Environment variables

- Runtime app configuration:
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`
  - `CONSULTANT_AUTH_MODE`
  - `SUPABASE_OAUTH_PROVIDER`
  - `OPENAI_API_KEY`
  - `OPENAI_REALTIME_MODEL`
  - `OPENAI_VOICE_NAME`
  - `OPENAI_SESSION_ANALYSIS_MODEL`
  - `OPENAI_PROJECT_SYNTHESIS_MODEL`
  - `BRAINTRUST_API_KEY`
  - `BRAINTRUST_PROJECT`
  - `RECOVERY_TOKEN_SECRET`
  - `CRON_SECRET`
- Setup-only bootstrap configuration:
  - `SUPABASE_ACCESS_TOKEN`
  - `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`
  - `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET`

### 11.1 Auth bootstrap notes

- `npm --prefix gather run supabase:bootstrap` patches Supabase `site_url` and `uri_allow_list` to match `NEXT_PUBLIC_APP_URL`.
- When `CONSULTANT_AUTH_MODE=supabase_oauth` and `SUPABASE_OAUTH_PROVIDER=google`, bootstrap also validates that the Google provider is enabled and has a client ID configured.
- If `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` are present during bootstrap, the script enables Google in the Supabase project through the Management API before validating.
- Google OAuth redirect URI is the Supabase-hosted callback endpoint: `${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`.
- Supabase redirect allow-list entries are the application callback URLs, such as `${NEXT_PUBLIC_APP_URL}/auth/callback` and `${NEXT_PUBLIC_APP_URL}/auth/callback?next=/app`.
- If OAuth mode is selected and the chosen provider is still disabled after bootstrap, the script fails before continuing so the misconfiguration is caught during setup instead of by end users.

## 12. Delivery slices

- docs and governance
- supabase schema and RLS
- participant realtime flow
- consultant app surfaces
- analysis and evals

## 13. Validation targets

- `npm --prefix gather run supabase:bootstrap`
- `npm run docs:check`
- `npm --prefix gather run typecheck`
- `npm --prefix gather run build`
- verify the selected consultant auth provider is enabled in the target Supabase project
- verify bootstrap confirms schema `app` exists and role `authenticated` has `USAGE` on it
- schema review for RLS coverage and queue idempotency
