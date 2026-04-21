# Issue Log

Last updated: April 21, 2026

Use this file for confirmed repo-specific issues only. Keep entries short and practical.

## I-001 Theme hotkey crash on non-keyboard events

- Problem: Theme hotkey code crashed on `event.key.toLowerCase()`.
- Cause: The handler assumed every `keydown` event had a string `key`. Plain `Event` objects can still be dispatched.
- Avoid: Treat browser events as untrusted. Guard the event shape before reading keyboard fields.
- Fix/Check: Verify `typeof event.key === "string"` before using it, then test `window.dispatchEvent(new Event("keydown"))`.

## I-002 Theme bootstrap script warning in root layout

- Problem: React/Next logged a warning about a script tag rendered from `app/layout.tsx`.
- Cause: Theme bootstrap JS was rendered inline inside the React tree in the root layout.
- Avoid: Do not inline startup theme scripts in the root layout render path.
- Fix/Check: Load the bootstrap through an external early-start script path and confirm the console warning is gone.

## I-003 Supabase Google OAuth provider disabled

- Problem: Google sign-in returned `400 validation_failed` with `Unsupported provider: provider is not enabled`.
- Cause: The app requested `provider=google`, but the target Supabase project had Google disabled and no client ID or secret configured.
- Avoid: When OAuth mode is enabled, verify the provider is enabled in the target Supabase project before testing login.
- Fix/Check: Configure the Google provider in Supabase, then confirm `/auth/login?provider=google` redirects to Google instead of returning JSON `400`.

## I-004 Auth route exposed in authenticated workspace navigation

- Problem: The consultant workspace sidebar showed `Auth` and linked to `/sign-in` even after the user was already signed in.
- Cause: The authenticated app shell treated sign-in as a primary workspace destination instead of an account action outside the task navigation.
- Avoid: Keep workspace nav limited to `/app` routes. Put sign-out or account affordances in the signed-in footer area, not in primary nav.
- Fix/Check: Sign in, confirm the sidebar shows only workspace destinations, and verify authenticated requests to `/sign-in` redirect to `/app`.

## I-005 Realtime transcript never reached persisted session review

- Problem: Completed interviews could show a blank transcript timeline because the participant client never wrote the realtime conversation history into `transcript_segments`.
- Cause: The voice shell connected to `RealtimeSession` but did not subscribe to history updates or flush transcript items before completion.
- Avoid: Persist completed `user` and `assistant` realtime message items during the interview and key them by a stable source item ID so retries stay idempotent.
- Fix/Check: Complete an interview, refresh the review page immediately, and confirm both participant and agent transcript rows are present without waiting for cron.

## I-006 Session completion enqueued analysis without dispatching it

- Problem: Completed interviews often showed placeholder analysis because `/complete` only enqueued jobs and then waited for cron or manual dispatch to process them.
- Cause: The completion route updated session state and inserted queued analysis jobs but never triggered a session-scoped dispatch path.
- Avoid: Treat session completion as the primary analysis trigger. Enqueue session jobs, process them immediately in deterministic order, and leave cron as recovery only.
- Fix/Check: Complete an interview and confirm generated outputs and quality signals are visible on first review-page load.

## I-007 Session summary overrides were ignored during synthesis

- Problem: Consultant summary overrides saved on a respondent review did not influence regenerated project synthesis.
- Cause: Project synthesis consumed only raw generated outputs and never merged `session_output_overrides` back into the effective per-session analysis.
- Avoid: Merge overrides at read time and use the same effective session output when regenerating synthesis.
- Fix/Check: Save a session summary override, rerun synthesis, and confirm the synthesis reflects the overridden respondent summary.

## I-008 Participant realtime session stayed active after completion

- Problem: After a respondent reached the completion screen, the browser microphone indicator could stay on and the agent could keep responding.
- Cause: The participant shell wrapped the OpenAI realtime session behind an ad-hoc lifecycle handle and failed to reuse the already-approved `MediaStream`, so the SDK kept its own microphone capture alive.
- Avoid: Do not rename SDK lifecycle methods behind custom handles. Reuse the existing `MediaStream` for browser realtime sessions, and always close the realtime session plus stop all acquired audio tracks on every exit path.
- Fix/Check: Complete or abandon a participant interview, confirm the mic indicator turns off immediately, and verify no further agent audio or transcript events arrive after the completion surface renders.

## I-009 Transcript save failed after adding realtime source item IDs

- Problem: Participant transcript flush requests failed with "We couldn't save the latest transcript updates."
- Cause: The app shipped code that reads and writes `transcript_segments.source_item_id` before the backing migration was applied to the active Supabase project.
- Avoid: Any schema-dependent participant runtime change must ship with its migration and be applied with `npm --prefix gather run supabase:bootstrap` before runtime verification.
- Fix/Check: Confirm `from("transcript_segments").select("source_item_id").limit(1)` succeeds, then complete an interview and verify transcript rows persist without the save error.

## I-010 Placeholder analysis persisted as ready-state output

- Problem: Respondent review and synthesis could show nonsense insights such as greetings, config text, and fabricated quote pills while the UI still marked analysis as ready.
- Cause: Session extraction and project synthesis persisted deterministic placeholder artifacts instead of real model outputs, reused the first participant turns as evidence across claims, and aggregated synthesis inputs before filtering excluded sessions.
- Avoid: Do not persist placeholder analysis rows as generated output. Validate every claim against exact participant segment IDs, drop claims without usable evidence, and filter synthesis inputs to completed non-excluded sessions before aggregation.
- Fix/Check: Complete an interview whose first participant turn is only a greeting, confirm the summary does not repeat the greeting, verify every evidence pill highlights the cited transcript rows only, and exclude a session to confirm it disappears from regenerated synthesis.

## I-011 Project bootstrap RPC failed on internal schema permissions

- Problem: Creating a new project failed with `Unable to create atomic project bootstrap: permission denied for schema app`.
- Cause: The consultant-authenticated RPC `public.create_project_with_defaults(...)` called `app.has_workspace_access(...)`, but the migrations never granted `USAGE` on schema `app` to the `authenticated` role.
- Avoid: Any consultant-authenticated RPC or RLS path that resolves objects from an internal schema must ship with the required schema privileges for the runtime role; function grants alone are not sufficient.
- Fix/Check: Confirm `has_schema_privilege('authenticated', 'app', 'USAGE')` is true after `npm --prefix gather run supabase:bootstrap`, then create a project successfully from `/app/projects/new`.

## I-012 Thin transcript evidence was over-promoted into confident themes

- Problem: Session analysis and project synthesis could overstate findings by promoting generic titles, reusing one weak transcript segment across multiple claims, or turning single-session noise into a cross-interview theme.
- Cause: The pipeline accepted loosely grounded insight candidates, did not consistently normalize overlapping theme labels, and lacked a deterministic eval corpus covering noisy greetings, non-linear answers, thin transcripts, subtle tensions, and synonym-heavy synthesis cases.
- Avoid: Keep analysis evidence-first. Drop claims with generic labels or untraceable quotes, require multi-segment support for subtle claims, compute synthesis theme frequency from distinct included sessions, and run `npm --prefix gather run analysis:eval` before shipping transcript-analysis changes.
- Fix/Check: Verify the analysis eval corpus passes for noisy, non-linear, thin-evidence, governance-tension, and synthesis-clustering fixture projects, and confirm shallow transcripts remain `partial` or `missing` instead of becoming confident insights.

## I-013 Session analysis context dropped project-level mode data

- Problem: After adding mode-aware prompts and labels, session analysis jobs no longer had access to the project record they needed to branch by `projectType`.
- Cause: `getParticipantSessionRuntimeBundle()` loaded the session and config version, but not the mapped project, so downstream analysis code could not safely pass project context into extraction and quality scoring.
- Avoid: Whenever prompt builders or runtime copy branch on immutable project metadata, make that metadata part of the shared analysis/runtime bundle instead of re-querying ad hoc at individual call sites.
- Fix/Check: Ensure `SessionAnalysisContext` includes `project`, then run `npm --prefix gather run typecheck` and complete both a discovery session and a feedback session to confirm extraction and quality scoring receive the right project type.

## I-014 Project type badge crashed on invalid runtime values

- Problem: Consultant dashboards crashed with `Cannot read properties of undefined (reading 'label')` while rendering project type badges.
- Cause: The UI trusted `project_type` as a typed `ProjectType`, but runtime data could still be missing or invalid before preset lookup.
- Avoid: Treat enum-like values from database rows and public config as untrusted until normalized at the data boundary.
- Fix/Check: Normalize project types to `discovery` before preset or badge lookup, then run `npm --prefix gather run test:fixtures`.

## I-015 Vercel Hobby deploy rejected frequent cron schedule

- Problem: Production deploy failed because Vercel Hobby accounts cannot run cron jobs more than once per day.
- Cause: `gather/vercel.json` scheduled `/api/internal/cron/analysis-recovery` every 15 minutes.
- Avoid: Keep Vercel cron schedules Hobby-compatible unless the target project is confirmed to be on Pro.
- Fix/Check: Use a daily recovery cron, then redeploy with `vercel --prod`.
