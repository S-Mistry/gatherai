# Technical Spec v1

Last updated: April 14, 2026

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
  - realtime voice integration helpers

### 3.2 Runtime topology
- Participant path:
  - browser loads `/i/[linkToken]`
  - page creates or resumes a participant session through a public route handler
  - route handler validates the link token, creates or resumes the session, and returns a signed recovery token plus session metadata
  - browser requests an OpenAI realtime client secret from a server route
  - browser connects to OpenAI Realtime over WebRTC
  - browser batches transcript and state events back to public route handlers
- Consultant path:
  - browser loads `/app/...`
  - server components and server actions fetch consultant-scoped data from Supabase
  - RLS restricts reads and writes to the consultant workspace
- Analysis path:
  - session completion enqueues transcript cleaning, extraction, quality scoring, and synthesis jobs
  - Vercel route handlers and cron sweeps claim queued jobs and process them
  - Braintrust traces and online scores are stored asynchronously

## 4. Routes and APIs

### 4.1 Public routes
- `/`
  - marketing overview and entry into consultant sign-in
- `/sign-in`
  - consultant email magic-link form
- `/i/[linkToken]`
  - participant disclosure, metadata collection, interview shell, resume/completion states

### 4.2 Consultant routes
- `/app`
  - workspace dashboard
- `/app/projects`
  - project list
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
  - ingest transcript segments and runtime state changes
- `POST /api/public/sessions/[sessionId]/complete`
  - finalize the session and enqueue downstream jobs

### 4.4 Internal APIs
- `POST /api/internal/jobs/dispatch`
  - claim and process a bounded set of queued jobs
- `GET /api/internal/cron/analysis-recovery`
  - cron-triggered recovery sweep guarded by `CRON_SECRET`

### 4.5 Consultant server actions
- project create/update/version
- session include/exclude toggle
- session quality override
- session output override save
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
  - current question pointer, counts, timers, novelty signals, pause state, and completion state
- `TranscriptSegment`
  - one ordered utterance from `participant`, `agent`, or `system`
- `EvidenceRef`
  - claim provenance linking `sessionId` and `segmentIds`
- `SessionOutputGenerated`
  - immutable generated extraction artifact
- `SessionOutputOverride`
  - consultant-written corrections or suppressions
- `ProjectSynthesisGenerated`
  - immutable synthesis artifact
- `ProjectSynthesisOverride`
  - consultant-written synthesis changes
- `QualityScore`
  - per-session quality dimensions and flag state
- `AnalysisJob`
  - queue record for transcript cleaning, extraction, scoring, or synthesis

### 5.2 Data invariants
- Every participant session stores the exact `project_config_version_id` used when the interview started.
- Raw transcript segments are append-only.
- Generated artifacts are immutable.
- Overrides are layered separately and merged at read time.
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
- retries increment `attempt_count` and set `next_attempt_at`
- cron sweeps reclaim stuck `processing` jobs whose lock has expired
- synthesis refresh jobs are deduplicated per project and config generation window where possible

## 8. Security model
- All consultant-owned tables use RLS.
- Public participant access never uses the service-role key in the browser.
- Service-role access exists only in route handlers, server actions, and cron handlers.
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
- projects list with status chips
- project detail with config version history, session table, quality flags, and synthesis summary
- session review page with evidence-backed claims and editable overrides

### 10.2 Participant UX
- one-click entry from the public link
- concise disclosure before microphone access
- optional metadata collection driven by config
- clear session length expectation
- microphone permission error state
- paused, resumed, and completed states

## 11. Environment variables
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_REALTIME_MODEL`
- `OPENAI_VOICE_NAME`
- `BRAINTRUST_API_KEY`
- `BRAINTRUST_PROJECT`
- `CRON_SECRET`

## 12. Delivery slices
- docs and governance
- supabase schema and RLS
- participant realtime flow
- consultant app surfaces
- analysis and evals

## 13. Validation targets
- `npm run docs:check`
- `npm --prefix gather run typecheck`
- `npm --prefix gather run build`
- schema review for RLS coverage and queue idempotency
