# Decision Log

Last updated: April 16, 2026

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
- Decision: consultants use Supabase Auth with Google OAuth by default, while email magic links remain a feature-flagged fallback. Each consultant has exactly one workspace in v1.
- Consequence: collaborator accounts and multi-user tenant administration are out of scope, and the deploy-time auth mode flag controls whether `/sign-in` shows Google OAuth or the legacy magic-link flow.

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
- Decision: session extraction and quality scoring use `gpt-5.4-mini`, while project synthesis uses `gpt-5.4`, all through structured Responses API calls with validated evidence refs.
- Consequence: the runtime environment contract includes dedicated analysis model variables, and generated outputs must not fall back to placeholder rows when structured extraction is unavailable.

## Reference Notes
- OpenAI Realtime docs describe WebRTC as ideal for browser and client-side interactions and document server-side controls for realtime sessions.
- OpenAI Agents SDK voice quickstart documents browser `RealtimeSession` using WebRTC by default.
- Supabase RLS docs state browser data access is safe when RLS is enabled and combined with Supabase Auth.
- Braintrust docs support online scoring rules for production logs, and the pricing page confirms a free starter tier with included scores.
