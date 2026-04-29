# PRD v1

Product name: Post-Experience Feedback and Testimonials

Status: Draft for implementation

Version: v1.0

Primary audience: product, engineering, design

MVP objective: create and deploy AI-assisted voice collection for post-experience feedback and lightweight voice testimonials, then help a consultant or operator improve delivery or publish approved reviews faster.

## Executive summary
- A consultant creates a `feedback` project, configures what the interviewer needs to learn, and shares a public link with respondents.
- A consultant can instead create a `testimonial` project, configure a short review prompt, and share a public voice-review link.
- Participants complete a short voice conversation with the AI in the browser.
- The system stores transcript-level data, generates structured outputs for each session, and synthesizes results across sessions to help the consultant plan the next intervention or improve the last one.
- The MVP stays narrow:
  - `feedback` is the default visible creation mode in normal operation
  - `testimonial` is a visible creation mode for simple voice-to-text reviews and website embeds
  - legacy `discovery` remains feature-flagged for existing or experimental use
  - single consultant user per workspace
  - no participant login
  - transcript-only storage
  - voice-first browser experience
  - evidence-backed planning and improvement support, not artifact generation

## Problem statement
Teams often need to collect evidence after a service, visit, event, course, consultation, or purchase. Manual interviews are slow, inconsistent, hard to scale, and harder to synthesize than a conversational system that is consistent and evidence-backed.

## Vision
Enable any consultant to run structured, scalable post-experience voice collection, with setup simple enough for solo use and outputs useful enough to shape the next improvement decision.

## Goals
- Let a consultant create a feedback project quickly.
- Let the consultant configure interview goals, required questions, and constraints.
- Generate a public project interview link.
- Let participants complete a voice interview in the browser without authentication.
- Let reviewers leave a short voice testimonial in the browser without authentication.
- Produce transcript-backed structured outputs per interview.
- Produce cross-interview synthesis for the project.
- Let consultants approve testimonial reviews before they appear in an embed.
- Help the consultant save time compared with manual interviewing.
- Preserve evidence traceability so the consultant can trust the outputs.

## Non-goals
- artifact generation for live sessions
- automated session deliverables
- exports
- video
- multilingual support
- sentiment scoring
- CRM sync
- custom branding
- advanced branding beyond a testimonial brand color
- native mobile app
- outbound email or reminders
- collaborator accounts
- arbitrary survey-builder workflows
- audio storage
- text-only fallback interviewing

## Users

### Consultant / facilitator
Needs:
- fast setup
- confidence that required questions are covered
- rich responses from respondents
- visibility into interview progress
- synthesis across interviews
- transcript evidence inspection

### Participant / respondent
Needs:
- low-friction access
- no login
- clear privacy expectations
- natural voice interaction
- concise experience
- confidence that the conversation has a clear purpose and ending

## Core use case
A consultant or operator configures the AI interviewer, shares one public link with respondents after an experience, collects short voice sessions, monitors incoming responses, reviews structured outputs, and uses synthesis to shape the next improvement decision.

For testimonials, a consultant configures a review link, collects short voice reviews, approves or rejects submitted text reviews, and embeds approved testimonials on their website.

## Success metrics

### Product metrics
- number of projects created
- number of interviews completed per project
- interview completion rate
- median interview length
- active projects per consultant
- consultant repeat usage

### Outcome metrics
- time saved versus manual follow-up interviewing
- consultant-rated usefulness of outputs
- percentage of projects where synthesis shapes an improvement decision

### Quality metrics
- required-question coverage rate
- answer specificity score
- faithfulness score for summaries and synthesis
- participant abandonment rate
- low-quality interview rate
- repetition rate
- percentage of sessions flagged as insufficient depth

## Product principles
1. Coverage beats elegance in MVP.
2. Evidence-backed outputs only.
3. Low-friction participant experience.
4. Consultant remains in control.
5. State machines over vibes.

## In scope
- consultant login
- one workspace per consultant
- project creation
- testimonial project creation
- interviewer configuration
- public project link
- public testimonial review link
- participant landing page
- realtime voice interview
- transcript capture
- structured per-session outputs
- project-level synthesis
- testimonial moderation and embed
- live monitoring
- session quality scoring
- consultant editing and exclusion controls

## Explicitly out of scope
- multiple templates per project
- product-managed email sending
- quotas
- collaborator roles
- audio download or playback
- deletion workflows
- advanced legal or compliance automation
- advanced stakeholder classification

## Functional requirements

### Authentication and workspace
- The system provides consultant authentication.
- The system creates exactly one workspace per consultant in MVP.
- Collaborator invites are not supported.
- Participants do not authenticate.

### Project creation
Each feedback or discovery project contains:
- immutable project type: `discovery` or `feedback`
- project name
- objective
- areas of interest
- required questions
- optional context
- interview mode
- interview duration cap
- anonymity mode
- optional metadata fields
- optional prohibited topics
- tone/style config

Project configuration changes must be versioned.
Project type does not change after creation.
`feedback` is the default project type.
`discovery` remains feature-flagged and is disabled by default in normal product flows.

Each testimonial project contains:
- immutable project type: `testimonial`
- project name
- business name
- website URL
- optional brand color
- optional headline
- optional review prompt

### Interview configuration
Required fields:
- project name
- objective
- areas of interest
- required questions
- duration cap
- interview mode
- anonymity mode

Optional fields:
- background context
- tone/style
- participant metadata prompts
- prohibited topics
- follow-up policy overrides

Modes:
- strict mode
- adaptive mode

### Participant entry flow
The public landing page shows:
- project intro
- short disclosure
- anonymity statement
- optional metadata fields
- start interview action
- mode-aware completion copy

### Voice interview
- Browser-based, speech-to-speech.
- One primary question at a time.
- Up to two follow-ups per core question by default for discovery, and one by default for feedback.
- More follow-ups only if novelty remains high and time allows.
- Feedback projects use required questions as a backbone, not a rigid survey script; the interviewer may probe high-signal answers immediately and then return to uncovered required questions.
- Feedback wording must mirror the configured experience context instead of assuming a specific event type or delivery format.
- Default feedback framing is a soft 5-10 minute conversation; near minute 8, the interviewer should start tying off open gaps and aim to finish around minute 10 unless a longer cap is configured.
- Summarize what was heard and allow clarification.
- Challenge vague answers when appropriate.
- Hard-stop at the configured max duration.
- Support interruption and barge-in.
- Support resumption if feasible.

Movement heuristics:
- participant says they are done
- novelty is low
- repetition is high
- per-question time threshold is exceeded
- sufficient answer coverage confidence is reached

### Transcript capture
- Store transcript only in MVP.
- Keep speaker separation.
- Store utterance or segment chunks.
- Store timestamps where available.
- Allow transcript cleaning before analysis.

### Per-session structured outputs
Required outputs:
- cleaned transcript
- question-by-question answers
- themes
- pain points
- opportunities
- risks
- key quotes
- confidence score
- unresolved questions
- respondent profile metadata

Outputs are system-generated, editable by the consultant, and evidence-backed.

### Project-level synthesis
Required outputs:
- cross-interview themes
- frequency counts
- contradiction map
- alignment and misalignment analysis
- top problems to address
- recommended focus areas
- notable quotes by theme

Synthesis updates as completed interviews accumulate and can also be manually refreshed.

### Live monitoring
The dashboard displays:
- in-motion projects with unresolved work or fresh activity
- in-progress sessions
- completed sessions
- abandoned sessions
- recent activity
- flagged low-quality interviews
- pending testimonial reviews
- top emerging themes

### Quality scoring
Scoring dimensions include:
- question coverage
- answer specificity
- repetition
- faithfulness of outputs
- decision usefulness

### Consultant controls
- edit structured outputs
- exclude interviews from synthesis
- mark or unmark low quality

## Non-functional requirements
- Low-latency participant experience.
- Responsive dashboard at MVP scale.
- Incomplete sessions must not corrupt project state.
- Realtime failures must not damage consultant-side data.
- Prompt and model versions must be auditable.
- Consultant data must be isolated correctly.

## Consent and privacy behavior
Before interview start, show:
- AI interviewer disclosure
- transcript notice
- mode-specific project purpose
- anonymity mode
- who can access results

MVP policy:
- no audio storage
- no participant login
- no participant transcript export
- no deletion workflow

## Edge cases
- participant closes the tab before completion
- microphone permission issues
- participant reopens a partially completed session
- repeated “I don’t know”
- extremely short answers
- off-topic answers
- excessively long monologues
- max duration reached with unanswered required questions
- project config changes while sessions already exist
- synthesis run with too few interviews

## Recommended stack
- Next.js on Vercel
- Supabase Auth
- Supabase Postgres
- Supabase RLS
- OpenAI Realtime API over WebRTC
- OpenAI Voice agents / Agents SDK as the starting point
- Braintrust for quality scoring and tracing

## Core entities
- users
- workspaces
- projects
- project_config_versions
- questions
- participant_links
- participant_sessions
- transcript_segments
- session_outputs
- project_syntheses
- quality_scores
- prompt_versions
- model_versions
- audit_logs

## Interview state machine
1. pre_start
2. consent
3. metadata_collection
4. intro
5. question_active
6. follow_up
7. question_summary_confirm
8. question_advance
9. wrap_up
10. complete
11. abandoned
12. paused

## Analytics events

### Consultant-side
- project_created
- project_config_saved
- project_link_copied
- synthesis_viewed
- session_reviewed
- output_edited
- session_excluded
- quality_flag_overridden

### Participant-side
- landing_viewed
- consent_accepted
- metadata_submitted
- interview_started
- interview_paused
- interview_resumed
- interview_completed
- interview_abandoned
- microphone_permission_denied

### System
- transcript_generated
- session_output_generated
- project_synthesis_generated
- quality_score_generated
- quality_flag_raised

## MVP release criteria
- consultant can sign in and create a project
- consultant can configure questions and constraints
- consultant can generate a public participant link
- participant can complete a voice interview in the browser
- transcript is stored and viewable
- per-session outputs are generated and reviewable
- cross-interview synthesis is generated
- consultant can edit or exclude outputs
- low-quality sessions can be flagged
- core data is isolated correctly between users

## Risks and mitigations
- Shallow interviews: follow-up policy, vague-answer challenge prompts, quality scoring, strict mode first.
- Repetitive conversations: warm interviewer persona, controlled follow-up counts, novelty heuristics.
- Missed required questions: explicit queue in app state, strict mode first, coverage scoring.
- Untrustworthy synthesis: evidence-backed outputs, faithfulness scoring, editable outputs.
- Distrust around anonymity: clear disclosure, configurable identity mode, low-friction entry.
- Too much complexity too early: defer exports, collaborators, reminders, arbitrary templates, and custom survey-builder workflows.

## Prioritization

### P0
- consultant auth
- project creation
- interview configuration
- public participant link
- realtime voice interview
- transcript capture
- per-session structured outputs
- project-level synthesis
- session quality scoring
- consultant review, edit, and exclusion controls

### P1
- resumable sessions
- adaptive mode
- richer monitoring
- stronger synthesis controls

### P2 / backlog
- exports
- email sending/reminders
- multiple templates per project
- collaborator roles
- audio storage
- arbitrary branching survey logic
- white-labeling
- multilingual support
- native mobile app

## Locked MVP defaults
- single-user consultant workspace
- one public project interview link
- immutable project type with shared collection engine
- no top-level client-name field on projects; `project.name` is the single required identifier
- transcript-only storage
- strict mode first
- evidence-backed structured outputs
- simple live monitoring
- quality scoring from day one
- cross-interview synthesis as the primary value surface
