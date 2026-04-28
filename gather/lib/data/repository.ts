import crypto from "node:crypto"

import type { User } from "@supabase/supabase-js"

import {
  signRecoveryToken,
  verifyRecoveryToken,
} from "@/lib/auth/recovery-token"
import { ensureConsultantWorkspace } from "@/lib/auth/consultant-workspace"
import { getAllowedConsultantUser } from "@/lib/auth/session"
import {
  buildEmptyProjectSynthesis,
  buildGeneratedOutputPlaceholder,
} from "@/lib/data/placeholders"
import {
  buildRecentNeedsReviewSessions,
  buildSessionMetrics,
  groupByProjectId,
} from "@/lib/data/derived"
import {
  getProjectEvidenceClaimDescriptor,
  MAX_PROJECT_EVIDENCE_EXCERPTS,
  resolveProjectClaimEvidence,
} from "@/lib/project-evidence"
import {
  generateProjectSynthesisAnalysis,
  generateSessionOutputAnalysis,
  evaluateSessionQualityAnalysis,
  PROJECT_SYNTHESIS_PROMPT_VERSION_TEXT,
  QUALITY_SCORE_PROMPT_VERSION_TEXT,
  SESSION_OUTPUT_PROMPT_VERSION_TEXT,
} from "@/lib/openai/analysis"
import {
  buildInitialRuntimeState,
  DEFAULT_RESUME_WINDOW_HOURS,
} from "@/lib/domain/state-machine"
import type {
  AnalysisJob,
  AnalysisJobStatus,
  AnalysisJobType,
  AnonymityMode,
  InsightCard,
  MetadataPrompt,
  ParticipantSession,
  ProjectConfigVersion,
  ProjectEvidenceClaimKind,
  ProjectEvidenceDrawerPayload,
  ProjectRecord,
  ProjectType,
  ProjectSynthesisGenerated,
  ProjectSynthesisOverride,
  PublicTestimonialConfig,
  QualityDimension,
  QualityScore,
  QuestionDefinition,
  QuestionReview,
  QuoteLibraryItem,
  SessionOutputGenerated,
  SessionOutputOverride,
  SessionQualityOverride,
  SessionRuntimeState,
  SessionStatus,
  TestimonialLink,
  TestimonialReview,
  TestimonialReviewStatus,
  TranscriptSegment,
  TranscriptSpeaker,
  WorkspaceSummary,
} from "@/lib/domain/types"
import { SESSION_ANALYSIS_JOB_TYPES } from "@/lib/jobs/analysis"
import {
  buildParticipantDisclosure,
  buildParticipantIntro,
  getAnonymousRespondentLabel,
  getProjectTypePreset,
  normalizeProjectType,
  resolveCreateProjectType,
  sanitizePublicInterviewConfig,
} from "@/lib/project-types"
import { isDiscoveryProjectsEnabled, openAiModels } from "@/lib/env"
import {
  createSecretSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server"
import {
  DEFAULT_TESTIMONIAL_HEADLINE,
  DEFAULT_TESTIMONIAL_PROMPT,
  normalizeBrandColor,
  normalizeOptionalText,
  normalizeTestimonialReviewStatus,
  normalizeWebsiteUrl,
  parseTestimonialRating,
  truncateReviewText,
} from "@/lib/testimonials"

interface ProfileRow {
  id: string
  user_id: string
  email: string
  full_name: string | null
}

interface WorkspaceRow {
  id: string
  name: string
  owner_user_id: string
}

interface ProjectRow {
  id: string
  workspace_id: string
  project_type: unknown
  name: string
  slug: string
  status: string
  created_at: string
  updated_at: string
}

interface ProjectConfigVersionRow {
  id: string
  project_id: string
  version_number: number
  objective: string
  areas_of_interest: unknown
  required_questions: unknown
  background_context: string | null
  duration_cap_minutes: number
  interview_mode: "strict" | "adaptive"
  anonymity_mode: AnonymityMode
  tone_style: string
  metadata_prompts: unknown
  prohibited_topics: unknown
  follow_up_limit: number
  created_at: string
}

interface ProjectPublicLinkRow {
  id: string
  project_id: string
  project_config_version_id: string
  link_token: string
  revoked_at: string | null
  created_at: string
}

interface ProjectBootstrapRow {
  project_id: string
  project_config_version_id: string
  public_link_id: string
  public_link_token: string
}

interface ParticipantSessionRow {
  id: string
  project_id: string
  project_config_version_id: string
  public_link_id: string
  respondent_label: string
  status: SessionStatus
  metadata: unknown
  quality_flag: boolean
  manual_quality_flag: boolean | null
  quality_override_note: string
  quality_override_updated_at: string | null
  excluded_from_synthesis: boolean
  runtime_state: unknown
  started_at: string
  last_activity_at: string
  completed_at: string | null
  resume_expires_at: string
}

interface ParticipantSessionListRow {
  id: string
  project_id: string
  respondent_label: string
  status: SessionStatus
  quality_flag: boolean
  excluded_from_synthesis: boolean
  last_activity_at: string
}

interface TranscriptSegmentRow {
  id: string
  session_id: string
  source_item_id: string | null
  speaker: TranscriptSpeaker
  content: string
  order_index: number
  start_offset_ms: number | null
  end_offset_ms: number | null
  created_at: string
}

interface SessionOutputGeneratedRow {
  id: string
  session_id: string
  cleaned_transcript: string
  payload: unknown
  prompt_version_id: string | null
  model_version_id: string | null
  created_at: string
}

interface SessionOutputOverrideRow {
  id: string
  session_id: string
  edited_summary: string
  consultant_notes: string
  suppressed_claim_ids: unknown
  updated_at: string
}

interface ProjectSynthesisGeneratedRow {
  id: string
  project_id: string
  included_session_ids: string[]
  payload: unknown
  prompt_version_id: string | null
  model_version_id: string | null
  created_at: string
}

interface ProjectSynthesisOverrideRow {
  id: string
  project_id: string
  edited_narrative: string
  consultant_notes: string
  updated_at: string
}

interface QualityScoreRow {
  id: string
  session_id: string
  overall: number | string
  low_quality: boolean
  scorer_source: "braintrust" | "application"
  dimensions: unknown
  updated_at: string
}

interface TestimonialLinkRow {
  id: string
  project_id: string
  link_token: string
  business_name: string
  website_url: string
  brand_color: string
  headline: string
  prompt: string
  revoked_at: string | null
  created_at: string
  updated_at: string
}

interface TestimonialReviewRow {
  id: string
  project_id: string
  testimonial_link_id: string
  transcript: string
  reviewer_name: string | null
  suggested_rating: number | null
  rating: number
  status: TestimonialReviewStatus
  created_at: string
  updated_at: string
}

interface AnalysisJobRow {
  id: string
  job_type: AnalysisJobType
  status: AnalysisJobStatus
  project_id: string | null
  session_id: string | null
  payload: unknown
  attempts: number
  max_attempts: number
  next_attempt_at: string
  claimed_at: string | null
  completed_at: string | null
  last_error: string | null
  created_at: string
}

interface TranscriptAppendSegmentRow {
  source_item_id?: string | null
  speaker: TranscriptSpeaker
  content: string
  start_offset_ms?: number | null
  end_offset_ms?: number | null
}

interface ConsultantContext {
  user: User
  profile: ProfileRow | null
  workspace: WorkspaceRow
}

interface NormalizedProjectCreateInput {
  projectType: ProjectType
  name: string
  slug: string
  objective: string
  areasOfInterest: string[]
  requiredQuestions: QuestionDefinition[]
  durationCapMinutes: number
  anonymityMode: AnonymityMode
  toneStyle: string
  followUpLimit: number
  testimonial?: {
    businessName: string
    websiteUrl: string
    brandColor: string
    headline: string
    prompt: string
  }
}

interface CreatedProjectGraph {
  projectRow: ProjectRow
  configRow: ProjectConfigVersionRow
  publicLinkToken: string
}

interface SessionRuntimePatch {
  state?: SessionRuntimeState["state"]
  activeQuestionId?: string | null
  askedQuestionIds?: string[]
  remainingQuestionIds?: string[]
  followUpCount?: number
  elapsedSeconds?: number
  questionElapsedSeconds?: number
  noveltyScore?: number
  repetitionScore?: number
  coverageConfidence?: number
  introDeliveredAt?: string
  readinessDetectedAt?: string
  interviewStartedAt?: string
  pausedAt?: string | null
}

interface ProjectBundleByLinkToken {
  client: SecretClient
  link: ProjectPublicLinkRow
  project: ProjectRow
  configRow: ProjectConfigVersionRow
  config: ProjectConfigVersion
}

interface ParticipantSessionLookup {
  client: SecretClient
  row: ParticipantSessionRow
  link: ProjectPublicLinkRow
  session: ParticipantSession
}

interface ParticipantSessionRuntimeBundle extends ParticipantSessionLookup {
  project: ProjectRecord
  configRow: ProjectConfigVersionRow
  config: ProjectConfigVersion
}

interface SessionAnalysisContext extends ParticipantSessionRuntimeBundle {
  transcript: TranscriptSegment[]
}

type ServerClient = NonNullable<
  Awaited<ReturnType<typeof createServerSupabaseClient>>
>
type SecretClient = NonNullable<ReturnType<typeof createSecretSupabaseClient>>
type RepositoryClient = ServerClient | SecretClient

function fail(message: string): never {
  throw new Error(message)
}

function expectData<T>(
  result: { data: T | null; error: { message: string } | null },
  message: string
) {
  if (result.error) {
    fail(`${message}: ${result.error.message}`)
  }

  if (!result.data) {
    fail(message)
  }

  return result.data
}

function expectRows<T>(
  result: { data: T[] | null; error: { message: string } | null },
  message: string
) {
  if (result.error) {
    fail(`${message}: ${result.error.message}`)
  }

  return result.data ?? []
}

function safeObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function safeStringRecord(value: unknown) {
  const record = safeObject(value)
  return Object.fromEntries(
    Object.entries(record).flatMap(([key, entryValue]) =>
      typeof entryValue === "string" ? [[key, entryValue]] : []
    )
  )
}

function safeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : []
}

function safeMetadataPrompts(value: unknown): MetadataPrompt[] {
  return Array.isArray(value)
    ? value.flatMap((entry, index) => {
        const item = safeObject(entry)
        if (typeof item.label !== "string") {
          return []
        }

        return [
          {
            id: typeof item.id === "string" ? item.id : `metadata-${index + 1}`,
            label: item.label,
            placeholder:
              typeof item.placeholder === "string"
                ? item.placeholder
                : item.label,
            required: Boolean(item.required),
          },
        ]
      })
    : []
}

function safeQuestionDefinitions(value: unknown): QuestionDefinition[] {
  return Array.isArray(value)
    ? value.flatMap((entry, index) => {
        const item = safeObject(entry)
        if (typeof item.prompt !== "string") {
          return []
        }

        return [
          {
            id: typeof item.id === "string" ? item.id : `question-${index + 1}`,
            prompt: item.prompt,
            goal:
              typeof item.goal === "string"
                ? item.goal
                : "Consultant supplied question.",
          },
        ]
      })
    : []
}

function safeQualityDimensions(value: unknown): QualityDimension[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const item = safeObject(entry)
        const key =
          item.key === "workshop_usefulness" ? "decision_usefulness" : item.key

        if (
          typeof key !== "string" ||
          typeof item.score !== "number" ||
          typeof item.rationale !== "string"
        ) {
          return []
        }

        return [
          {
            key: key as QualityDimension["key"],
            score: item.score,
            rationale: item.rationale,
          },
        ]
      })
    : []
}

function safeQuestionReviews(value: unknown): QuestionReview[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const item = safeObject(entry)
        if (
          typeof item.questionId !== "string" ||
          typeof item.prompt !== "string" ||
          typeof item.status !== "string" ||
          typeof item.answer !== "string" ||
          typeof item.confidence !== "number"
        ) {
          return []
        }

        return [
          {
            questionId: item.questionId,
            prompt: item.prompt,
            status: item.status as QuestionReview["status"],
            answer: item.answer,
            confidence: item.confidence,
            keyPoints: safeStringArray(item.keyPoints),
            evidence: Array.isArray(item.evidence)
              ? (item.evidence as QuestionReview["evidence"])
              : [],
            evidenceQuotes: safeStringArray(item.evidenceQuotes),
            followUpQuestions: safeStringArray(item.followUpQuestions),
          },
        ]
      })
    : []
}

function safeQuoteLibrary(value: unknown): QuoteLibraryItem[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const item = safeObject(entry)
        if (
          typeof item.id !== "string" ||
          typeof item.label !== "string" ||
          typeof item.excerpt !== "string" ||
          typeof item.context !== "string"
        ) {
          return []
        }

        return [
          {
            id: item.id,
            label: item.label,
            excerpt: item.excerpt,
            context: item.context,
            questionIds: safeStringArray(item.questionIds),
            themeHints: safeStringArray(item.themeHints),
            evidence: Array.isArray(item.evidence)
              ? (item.evidence as QuoteLibraryItem["evidence"])
              : [],
          },
        ]
      })
    : []
}

function safeInsightCards(value: unknown): InsightCard[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const item = safeObject(entry)
        if (
          typeof item.id !== "string" ||
          typeof item.kind !== "string" ||
          typeof item.title !== "string" ||
          typeof item.summary !== "string" ||
          typeof item.priority !== "string"
        ) {
          return []
        }

        return [
          {
            id: item.id,
            kind: item.kind as InsightCard["kind"],
            title: item.title,
            summary: item.summary,
            priority: item.priority as InsightCard["priority"],
            evidence: Array.isArray(item.evidence)
              ? (item.evidence as InsightCard["evidence"])
              : [],
            evidenceQuotes: safeStringArray(item.evidenceQuotes),
          },
        ]
      })
    : []
}

function pickConsultantName(profile: ProfileRow | null, user: User) {
  if (profile?.full_name) {
    return profile.full_name
  }

  if (typeof user.user_metadata?.full_name === "string") {
    return user.user_metadata.full_name
  }

  return (profile?.email ?? user.email ?? "consultant").split("@")[0]
}

function buildWorkspaceSummary(
  workspace: WorkspaceRow,
  profile: ProfileRow | null,
  user: User
): WorkspaceSummary {
  return {
    id: workspace.id,
    name: workspace.name,
    consultantName: pickConsultantName(profile, user),
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function mapConfigVersion(row: ProjectConfigVersionRow): ProjectConfigVersion {
  return {
    id: row.id,
    projectId: row.project_id,
    versionNumber: row.version_number,
    createdAt: row.created_at,
    objective: row.objective,
    areasOfInterest: safeStringArray(row.areas_of_interest),
    requiredQuestions: safeQuestionDefinitions(row.required_questions),
    backgroundContext: row.background_context ?? undefined,
    durationCapMinutes: row.duration_cap_minutes,
    interviewMode: row.interview_mode,
    anonymityMode: row.anonymity_mode,
    toneStyle: row.tone_style,
    metadataPrompts: safeMetadataPrompts(row.metadata_prompts),
    prohibitedTopics: safeStringArray(row.prohibited_topics),
    followUpLimit: row.follow_up_limit,
  }
}

function mapProject(
  row: ProjectRow,
  configVersionId: string,
  publicLinkToken: string
): ProjectRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectType: normalizeProjectType(row.project_type),
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: (row.status || "draft") as ProjectRecord["status"],
    currentConfigVersionId: configVersionId,
    publicLinkToken,
  }
}

function mapSession(
  row: ParticipantSessionRow,
  publicLinkToken: string
): ParticipantSession {
  const runtimeState = safeObject(row.runtime_state)
  const qualityOverride: SessionQualityOverride | undefined =
    typeof row.manual_quality_flag === "boolean" &&
    typeof row.quality_override_updated_at === "string"
      ? {
          lowQuality: row.manual_quality_flag,
          note: row.quality_override_note,
          updatedAt: row.quality_override_updated_at,
        }
      : undefined

  return {
    id: row.id,
    projectId: row.project_id,
    projectConfigVersionId: row.project_config_version_id,
    publicLinkToken,
    respondentLabel: row.respondent_label,
    status: row.status,
    startedAt: row.started_at,
    lastActivityAt: row.last_activity_at,
    completedAt: row.completed_at ?? undefined,
    resumeExpiresAt: row.resume_expires_at,
    metadata: safeStringRecord(row.metadata),
    qualityFlag: row.quality_flag,
    qualityOverride,
    excludedFromSynthesis: row.excluded_from_synthesis,
    runtimeState: {
      state:
        typeof runtimeState.state === "string"
          ? (runtimeState.state as ParticipantSession["runtimeState"]["state"])
          : "consent",
      activeQuestionId:
        typeof runtimeState.activeQuestionId === "string"
          ? runtimeState.activeQuestionId
          : undefined,
      askedQuestionIds: safeStringArray(runtimeState.askedQuestionIds),
      remainingQuestionIds: safeStringArray(runtimeState.remainingQuestionIds),
      followUpCount:
        typeof runtimeState.followUpCount === "number"
          ? runtimeState.followUpCount
          : 0,
      elapsedSeconds:
        typeof runtimeState.elapsedSeconds === "number"
          ? runtimeState.elapsedSeconds
          : 0,
      questionElapsedSeconds:
        typeof runtimeState.questionElapsedSeconds === "number"
          ? runtimeState.questionElapsedSeconds
          : 0,
      noveltyScore:
        typeof runtimeState.noveltyScore === "number"
          ? runtimeState.noveltyScore
          : 1,
      repetitionScore:
        typeof runtimeState.repetitionScore === "number"
          ? runtimeState.repetitionScore
          : 0,
      coverageConfidence:
        typeof runtimeState.coverageConfidence === "number"
          ? runtimeState.coverageConfidence
          : 0,
      summaryPending: Boolean(runtimeState.summaryPending),
      hardStopAt:
        typeof runtimeState.hardStopAt === "string"
          ? runtimeState.hardStopAt
          : row.resume_expires_at,
      introDeliveredAt:
        typeof runtimeState.introDeliveredAt === "string"
          ? runtimeState.introDeliveredAt
          : undefined,
      readinessDetectedAt:
        typeof runtimeState.readinessDetectedAt === "string"
          ? runtimeState.readinessDetectedAt
          : undefined,
      interviewStartedAt:
        typeof runtimeState.interviewStartedAt === "string"
          ? runtimeState.interviewStartedAt
          : undefined,
      pausedAt:
        typeof runtimeState.pausedAt === "string"
          ? runtimeState.pausedAt
          : undefined,
    },
  }
}

function mapTranscript(row: TranscriptSegmentRow): TranscriptSegment {
  return {
    id: row.id,
    sessionId: row.session_id,
    sourceItemId: row.source_item_id ?? undefined,
    speaker: row.speaker,
    text: row.content,
    createdAt: row.created_at,
    orderIndex: row.order_index,
    startOffsetMs: row.start_offset_ms ?? undefined,
    endOffsetMs: row.end_offset_ms ?? undefined,
  }
}

function mapGeneratedOutput(
  row: SessionOutputGeneratedRow
): SessionOutputGenerated {
  const payload = safeObject(row.payload)
  const projectImplications = safeStringArray(
    payload.projectImplications ?? payload.workshopImplications
  )
  const respondentProfile = safeStringRecord(
    payload.respondentProfile ?? payload.stakeholderProfile
  )
  return {
    id: row.id,
    sessionId: row.session_id,
    cleanedTranscript: row.cleaned_transcript,
    summary:
      typeof payload.summary === "string" && payload.summary.trim().length > 0
        ? payload.summary
        : row.cleaned_transcript,
    questionAnswers: Array.isArray(payload.questionAnswers)
      ? (payload.questionAnswers as SessionOutputGenerated["questionAnswers"])
      : [],
    questionReviews: safeQuestionReviews(payload.questionReviews),
    themes: Array.isArray(payload.themes)
      ? (payload.themes as SessionOutputGenerated["themes"])
      : [],
    painPoints: Array.isArray(payload.painPoints)
      ? (payload.painPoints as SessionOutputGenerated["painPoints"])
      : [],
    opportunities: Array.isArray(payload.opportunities)
      ? (payload.opportunities as SessionOutputGenerated["opportunities"])
      : [],
    risks: Array.isArray(payload.risks)
      ? (payload.risks as SessionOutputGenerated["risks"])
      : [],
    keyQuotes: Array.isArray(payload.keyQuotes)
      ? (payload.keyQuotes as SessionOutputGenerated["keyQuotes"])
      : [],
    quoteLibrary: safeQuoteLibrary(payload.quoteLibrary),
    insightCards: safeInsightCards(payload.insightCards),
    tensions: Array.isArray(payload.tensions)
      ? (payload.tensions as SessionOutputGenerated["tensions"])
      : [],
    unresolvedQuestions: safeStringArray(payload.unresolvedQuestions),
    projectImplications,
    recommendedActions: safeStringArray(payload.recommendedActions),
    analysisWarnings: safeStringArray(payload.analysisWarnings),
    confidenceScore:
      typeof payload.confidenceScore === "number" ? payload.confidenceScore : 0,
    respondentProfile,
    promptVersionId: row.prompt_version_id ?? "pending",
    modelVersionId: row.model_version_id ?? "pending",
    createdAt: row.created_at,
  }
}

function mapOutputOverride(
  row: SessionOutputOverrideRow
): SessionOutputOverride {
  return {
    id: row.id,
    sessionId: row.session_id,
    editedSummary: row.edited_summary,
    suppressedClaimIds: safeStringArray(row.suppressed_claim_ids),
    consultantNotes: row.consultant_notes,
    updatedAt: row.updated_at,
  }
}

function mergeSessionOutputWithOverride(
  generatedOutput: SessionOutputGenerated,
  override?: SessionOutputOverride
): SessionOutputGenerated {
  if (!override) {
    return generatedOutput
  }

  const suppressedClaimIds = new Set(override.suppressedClaimIds)
  const summary = override.editedSummary.trim() || generatedOutput.summary

  return {
    ...generatedOutput,
    summary,
    themes: generatedOutput.themes.filter(
      (theme) => !suppressedClaimIds.has(theme.id)
    ),
    painPoints: generatedOutput.painPoints.filter(
      (claim) => !suppressedClaimIds.has(claim.id)
    ),
    opportunities: generatedOutput.opportunities.filter(
      (claim) => !suppressedClaimIds.has(claim.id)
    ),
    risks: generatedOutput.risks.filter(
      (claim) => !suppressedClaimIds.has(claim.id)
    ),
    keyQuotes: generatedOutput.keyQuotes.filter(
      (claim) => !suppressedClaimIds.has(claim.id)
    ),
    quoteLibrary: generatedOutput.quoteLibrary.filter(
      (quote) => !suppressedClaimIds.has(quote.id)
    ),
    insightCards: generatedOutput.insightCards.filter(
      (card) => !suppressedClaimIds.has(card.id)
    ),
    tensions: generatedOutput.tensions.filter(
      (claim) => !suppressedClaimIds.has(claim.id)
    ),
  }
}

function mapSynthesis(
  row: ProjectSynthesisGeneratedRow
): ProjectSynthesisGenerated {
  const payload = safeObject(row.payload)
  return {
    id: row.id,
    projectId: row.project_id,
    includedSessionIds: Array.isArray(row.included_session_ids)
      ? row.included_session_ids
      : [],
    executiveSummary:
      typeof payload.executiveSummary === "string"
        ? payload.executiveSummary
        : "",
    crossInterviewThemes: Array.isArray(payload.crossInterviewThemes)
      ? (payload.crossInterviewThemes as ProjectSynthesisGenerated["crossInterviewThemes"])
      : [],
    contradictionMap: Array.isArray(payload.contradictionMap)
      ? (payload.contradictionMap as ProjectSynthesisGenerated["contradictionMap"])
      : [],
    alignmentSignals: safeStringArray(payload.alignmentSignals),
    misalignmentSignals: safeStringArray(payload.misalignmentSignals),
    topProblems: safeStringArray(payload.topProblems),
    recommendedFocusAreas: safeStringArray(
      payload.recommendedFocusAreas ?? payload.suggestedWorkshopAgenda
    ),
    notableQuotesByTheme: Array.isArray(payload.notableQuotesByTheme)
      ? (payload.notableQuotesByTheme as ProjectSynthesisGenerated["notableQuotesByTheme"])
      : [],
    warning: typeof payload.warning === "string" ? payload.warning : undefined,
    promptVersionId: row.prompt_version_id ?? "pending",
    modelVersionId: row.model_version_id ?? "pending",
    createdAt: row.created_at,
  }
}

function mapSynthesisOverride(
  row: ProjectSynthesisOverrideRow
): ProjectSynthesisOverride {
  return {
    id: row.id,
    projectId: row.project_id,
    editedNarrative: row.edited_narrative,
    consultantNotes: row.consultant_notes,
    updatedAt: row.updated_at,
  }
}

function mergeSynthesisWithOverride(
  generated: ProjectSynthesisGenerated,
  override?: ProjectSynthesisOverride
): ProjectSynthesisGenerated {
  if (!override?.editedNarrative.trim()) {
    return generated
  }

  return {
    ...generated,
    executiveSummary: override.editedNarrative.trim(),
  }
}

function mapQualityScore(row: QualityScoreRow): QualityScore {
  return {
    id: row.id,
    sessionId: row.session_id,
    overall:
      typeof row.overall === "number"
        ? row.overall
        : Number.parseFloat(row.overall),
    lowQuality: row.low_quality,
    dimensions: safeQualityDimensions(row.dimensions),
    scorerSource: row.scorer_source,
    updatedAt: row.updated_at,
  }
}

function mapTestimonialLink(row: TestimonialLinkRow): TestimonialLink {
  return {
    id: row.id,
    projectId: row.project_id,
    linkToken: row.link_token,
    businessName: row.business_name,
    websiteUrl: row.website_url,
    brandColor: row.brand_color,
    headline: row.headline,
    prompt: row.prompt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    revokedAt: row.revoked_at ?? undefined,
  }
}

function mapTestimonialReview(row: TestimonialReviewRow): TestimonialReview {
  return {
    id: row.id,
    projectId: row.project_id,
    testimonialLinkId: row.testimonial_link_id,
    transcript: row.transcript,
    reviewerName: row.reviewer_name ?? undefined,
    suggestedRating: row.suggested_rating ?? undefined,
    rating: row.rating,
    status: normalizeTestimonialReviewStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapAnalysisJob(row: AnalysisJobRow): AnalysisJob {
  return {
    id: row.id,
    type: row.job_type,
    status: row.status,
    projectId: row.project_id ?? undefined,
    sessionId: row.session_id ?? undefined,
    payload: safeObject(row.payload),
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextAttemptAt: row.next_attempt_at,
    lockedAt: row.claimed_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
  }
}

function keyByProjectId<T extends { project_id: string }>(rows: T[]) {
  const map = new Map<string, T>()
  rows.forEach((row) => {
    if (!map.has(row.project_id)) {
      map.set(row.project_id, row)
    }
  })
  return map
}

function parseLineList(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function normalizeProjectCreateInput(
  input: {
    projectType: string
    name: string
    objective: string
    areasOfInterest: string
    requiredQuestions: string
    durationCapMinutes: number
    anonymityMode: string
    testimonialBusinessName?: string
    testimonialWebsiteUrl?: string
    testimonialBrandColor?: string
    testimonialHeadline?: string
    testimonialPrompt?: string
  },
  slug: string
): NormalizedProjectCreateInput {
  if (input.projectType === "discovery" && !isDiscoveryProjectsEnabled) {
    fail("Discovery projects are disabled in this environment.")
  }

  const projectType = resolveCreateProjectType(
    input.projectType,
    isDiscoveryProjectsEnabled
  )
  const preset = getProjectTypePreset(projectType)
  const areasOfInterest = input.areasOfInterest
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
  const requiredQuestions = input.requiredQuestions
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((prompt, index) => ({
      id: `q-${index + 1}`,
      prompt,
      goal: "Consultant supplied question.",
    }))

  const normalized: NormalizedProjectCreateInput = {
    projectType,
    name: input.name || "Untitled project",
    slug,
    objective: input.objective || preset.objective,
    areasOfInterest:
      areasOfInterest.length > 0 ? areasOfInterest : preset.areasOfInterest,
    requiredQuestions:
      requiredQuestions.length > 0
        ? requiredQuestions
        : preset.requiredQuestions.map((prompt, index) => ({
            id: `q-default-${index + 1}`,
            prompt,
            goal: "Mode starter question.",
          })),
    durationCapMinutes:
      projectType === "testimonial"
        ? preset.durationCapMinutes
        : Number.isFinite(input.durationCapMinutes) &&
            input.durationCapMinutes >= 4
          ? Math.min(input.durationCapMinutes, 30)
          : preset.durationCapMinutes,
    anonymityMode: (["named", "pseudonymous", "anonymous"].includes(
      input.anonymityMode
    )
      ? input.anonymityMode
      : preset.anonymityMode) as AnonymityMode,
    toneStyle: preset.toneStyle,
    followUpLimit: preset.followUpLimit,
  }

  if (projectType === "testimonial") {
    const websiteUrl = normalizeWebsiteUrl(input.testimonialWebsiteUrl)

    if (!websiteUrl) {
      fail("A valid website URL is required for testimonial projects.")
    }

    normalized.testimonial = {
      businessName: normalizeOptionalText(
        input.testimonialBusinessName,
        normalized.name
      ),
      websiteUrl,
      brandColor: normalizeBrandColor(input.testimonialBrandColor),
      headline: normalizeOptionalText(
        input.testimonialHeadline,
        DEFAULT_TESTIMONIAL_HEADLINE
      ),
      prompt: normalizeOptionalText(
        input.testimonialPrompt,
        DEFAULT_TESTIMONIAL_PROMPT
      ),
    }
  }

  return normalized
}

async function loadCreatedProjectGraph(
  client: ServerClient,
  bootstrap: ProjectBootstrapRow
): Promise<CreatedProjectGraph> {
  const [projectResult, configResult] = await Promise.all([
    client
      .from("projects")
      .select("*")
      .eq("id", bootstrap.project_id)
      .single<ProjectRow>(),
    client
      .from("project_config_versions")
      .select("*")
      .eq("id", bootstrap.project_config_version_id)
      .single<ProjectConfigVersionRow>(),
  ])

  return {
    projectRow: expectData(projectResult, "Unable to load created project"),
    configRow: expectData(
      configResult,
      "Unable to load created project configuration"
    ),
    publicLinkToken: bootstrap.public_link_token,
  }
}

async function createProjectGraphViaRpc(
  client: ServerClient,
  workspaceId: string,
  input: NormalizedProjectCreateInput
) {
  const result = await client
    .rpc("create_project_with_defaults", {
      target_workspace_id: workspaceId,
      project_project_type: input.projectType,
      project_name: input.name,
      project_slug: input.slug,
      project_objective: input.objective,
      project_areas_of_interest: input.areasOfInterest,
      project_required_questions: input.requiredQuestions,
      project_duration_cap_minutes: input.durationCapMinutes,
      project_anonymity_mode: input.anonymityMode,
      project_tone_style: input.toneStyle,
      project_follow_up_limit: input.followUpLimit,
    })
    .single<ProjectBootstrapRow>()

  if (result.error?.code === "PGRST202") {
    return null
  }

  return loadCreatedProjectGraph(
    client,
    expectData(result, "Unable to create atomic project bootstrap")
  )
}

async function createProjectGraphLegacy(
  client: ServerClient,
  workspaceId: string,
  input: NormalizedProjectCreateInput
) {
  const projectInsertResult = await client
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      project_type: input.projectType,
      name: input.name,
      slug: input.slug,
      status: "draft",
    })
    .select("*")
    .single<ProjectRow>()
  const projectRow = expectData(projectInsertResult, "Unable to create project")

  const configInsertResult = await client
    .from("project_config_versions")
    .insert({
      project_id: projectRow.id,
      version_number: 1,
      objective: input.objective,
      areas_of_interest: input.areasOfInterest,
      required_questions: input.requiredQuestions,
      duration_cap_minutes: input.durationCapMinutes,
      interview_mode: "strict",
      anonymity_mode: input.anonymityMode,
      tone_style: input.toneStyle,
      metadata_prompts: [],
      prohibited_topics: [],
      follow_up_limit: input.followUpLimit,
    })
    .select("*")
    .single<ProjectConfigVersionRow>()
  const configRow = expectData(
    configInsertResult,
    "Unable to create project configuration version"
  )

  const linkInsertResult = await client
    .from("project_public_links")
    .insert({
      project_id: projectRow.id,
      project_config_version_id: configRow.id,
      link_token: `link-${crypto.randomUUID()}`,
    })
    .select("*")
    .single<ProjectPublicLinkRow>()
  const linkRow = expectData(
    linkInsertResult,
    "Unable to create project public link"
  )

  return {
    projectRow,
    configRow,
    publicLinkToken: linkRow.link_token,
  }
}

async function createInitialTestimonialLink(
  client: ServerClient,
  projectId: string,
  input: NonNullable<NormalizedProjectCreateInput["testimonial"]>
) {
  const result = await client
    .from("testimonial_links")
    .insert({
      project_id: projectId,
      link_token: `test-${crypto.randomUUID()}`,
      business_name: input.businessName,
      website_url: input.websiteUrl,
      brand_color: input.brandColor,
      headline: input.headline,
      prompt: input.prompt,
    })
    .select("*")
    .single<TestimonialLinkRow>()

  return mapTestimonialLink(
    expectData(result, "Unable to create testimonial link")
  )
}

async function getConsultantContext(): Promise<ConsultantContext | null> {
  const client = await createServerSupabaseClient()

  if (!client) {
    return null
  }

  const user = await getAllowedConsultantUser(client)
  if (!user) {
    return null
  }

  let [profileResult, workspaceResult] = await Promise.all([
    client
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle<ProfileRow>(),
    client.from("workspaces").select("*").limit(1).maybeSingle<WorkspaceRow>(),
  ])

  if (profileResult.error) {
    fail(`Unable to load profile: ${profileResult.error.message}`)
  }

  if (workspaceResult.error) {
    fail(`Unable to load workspace: ${workspaceResult.error.message}`)
  }

  if (!profileResult.data || !workspaceResult.data) {
    await ensureConsultantWorkspace(client, user)
    ;[profileResult, workspaceResult] = await Promise.all([
      client
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle<ProfileRow>(),
      client
        .from("workspaces")
        .select("*")
        .limit(1)
        .maybeSingle<WorkspaceRow>(),
    ])

    if (profileResult.error) {
      fail(`Unable to load profile: ${profileResult.error.message}`)
    }

    if (workspaceResult.error) {
      fail(`Unable to load workspace: ${workspaceResult.error.message}`)
    }
  }

  if (!workspaceResult.data) {
    fail("No workspace is available for this consultant.")
  }

  return {
    user,
    profile: profileResult.data,
    workspace: workspaceResult.data,
  }
}

async function getRequiredConsultantContext() {
  const context = await getConsultantContext()

  if (!context) {
    fail("Consultant authentication is required.")
  }

  return context
}

function requireSecretClient() {
  const client = createSecretSupabaseClient()

  if (!client) {
    fail("Supabase secret-key environment is not configured.")
  }

  return client
}

async function getLatestConfigVersions(
  client: RepositoryClient,
  projectIds: string[]
) {
  if (projectIds.length === 0) {
    return new Map<string, ProjectConfigVersionRow>()
  }

  const result = await client
    .from("project_config_versions")
    .select("*")
    .in("project_id", projectIds)
    .order("project_id", { ascending: true })
    .order("version_number", { ascending: false })

  return keyByProjectId(
    expectRows(
      result,
      "Unable to load project configuration versions"
    ) as ProjectConfigVersionRow[]
  )
}

async function getLatestPublicLinks(
  client: RepositoryClient,
  projectIds: string[]
) {
  if (projectIds.length === 0) {
    return new Map<string, ProjectPublicLinkRow>()
  }

  const result = await client
    .from("project_public_links")
    .select("*")
    .in("project_id", projectIds)
    .is("revoked_at", null)
    .order("project_id", { ascending: true })
    .order("created_at", { ascending: false })

  return keyByProjectId(
    expectRows(
      result,
      "Unable to load project public links"
    ) as ProjectPublicLinkRow[]
  )
}

async function getLatestSyntheses(
  client: RepositoryClient,
  projectIds: string[]
) {
  if (projectIds.length === 0) {
    return new Map<string, ProjectSynthesisGeneratedRow>()
  }

  const result = await client
    .from("project_syntheses_generated")
    .select("*")
    .in("project_id", projectIds)
    .order("project_id", { ascending: true })
    .order("created_at", { ascending: false })

  return keyByProjectId(
    expectRows(
      result,
      "Unable to load project syntheses"
    ) as ProjectSynthesisGeneratedRow[]
  )
}

async function ensureProjectSlug(
  client: ServerClient,
  workspaceId: string,
  name: string
) {
  const base = slugify(name) || "untitled-discovery-project"
  const result = await client
    .from("projects")
    .select("slug")
    .eq("workspace_id", workspaceId)
    .like("slug", `${base}%`)

  const rows = expectRows(
    result,
    "Unable to inspect existing project slugs"
  ) as Array<{
    slug: string
  }>
  const slugs = new Set(rows.map((row) => row.slug as string))

  if (!slugs.has(base)) {
    return base
  }

  let suffix = 2
  let candidate = `${base}-${suffix}`

  while (slugs.has(candidate)) {
    suffix += 1
    candidate = `${base}-${suffix}`
  }

  return candidate
}

async function ensurePromptVersion(
  client: SecretClient,
  workspaceId: string,
  key: string,
  version: string,
  promptText: string
) {
  const result = await client
    .from("prompt_versions")
    .upsert(
      {
        workspace_id: workspaceId,
        key,
        version,
        prompt_text: promptText,
      },
      { onConflict: "workspace_id,key,version" }
    )
    .select("id")
    .single<{ id: string }>()

  return expectData(result, `Unable to ensure prompt version ${key}/${version}`)
    .id
}

async function ensureModelVersion(
  client: SecretClient,
  workspaceId: string,
  key: string,
  provider: string,
  modelName: string
) {
  const result = await client
    .from("model_versions")
    .upsert(
      {
        workspace_id: workspaceId,
        key,
        provider,
        model_name: modelName,
      },
      { onConflict: "workspace_id,key,model_name" }
    )
    .select("id")
    .single<{ id: string }>()

  return expectData(
    result,
    `Unable to ensure model version ${key}/${modelName}`
  ).id
}

function buildPublicInterviewConfig(bundle: {
  project: ProjectRow
  config: ProjectConfigVersion
}) {
  const projectType = normalizeProjectType(bundle.project.project_type)

  if (projectType === "testimonial") {
    fail("Testimonials do not use the interview runtime.")
  }

  return sanitizePublicInterviewConfig({
    projectId: bundle.project.id,
    projectType,
    projectName: bundle.project.name,
    objective: bundle.config.objective,
    durationCapMinutes: bundle.config.durationCapMinutes,
    anonymityMode: bundle.config.anonymityMode,
    toneStyle: bundle.config.toneStyle,
    followUpLimit: bundle.config.followUpLimit,
    intro: buildParticipantIntro(projectType),
    disclosure: buildParticipantDisclosure(projectType),
    areasOfInterest: bundle.config.areasOfInterest,
    requiredQuestions: bundle.config.requiredQuestions,
    metadataPrompts: bundle.config.metadataPrompts,
  })
}

async function getProjectBundleByLinkToken(
  linkToken: string
): Promise<ProjectBundleByLinkToken | null> {
  const client = requireSecretClient()
  const linkResult = await client
    .from("project_public_links")
    .select("*")
    .eq("link_token", linkToken)
    .is("revoked_at", null)
    .maybeSingle<ProjectPublicLinkRow>()

  if (linkResult.error) {
    fail(`Unable to load project link: ${linkResult.error.message}`)
  }

  if (!linkResult.data) {
    return null
  }

  const [projectResult, configResult] = await Promise.all([
    client
      .from("projects")
      .select("*")
      .eq("id", linkResult.data.project_id)
      .single<ProjectRow>(),
    client
      .from("project_config_versions")
      .select("*")
      .eq("id", linkResult.data.project_config_version_id)
      .single<ProjectConfigVersionRow>(),
  ])

  const configRow = expectData(
    configResult,
    "Unable to load linked project configuration"
  )

  return {
    client,
    link: expectData(linkResult, "Unable to load project link"),
    project: expectData(projectResult, "Unable to load linked project"),
    configRow,
    config: mapConfigVersion(configRow),
  }
}

async function getParticipantSessionLookup(
  sessionId: string
): Promise<ParticipantSessionLookup | null> {
  const client = requireSecretClient()
  const sessionResult = await client
    .from("participant_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle<ParticipantSessionRow>()

  if (sessionResult.error) {
    fail(`Unable to load participant session: ${sessionResult.error.message}`)
  }

  if (!sessionResult.data) {
    return null
  }

  const linkResult = await client
    .from("project_public_links")
    .select("*")
    .eq("id", sessionResult.data.public_link_id)
    .single<ProjectPublicLinkRow>()

  const link = expectData(linkResult, "Unable to load session public link")

  return {
    client,
    row: sessionResult.data,
    link,
    session: mapSession(sessionResult.data, link.link_token),
  }
}

async function getParticipantSessionRuntimeBundle(
  sessionId: string
): Promise<ParticipantSessionRuntimeBundle | null> {
  const lookup = await getParticipantSessionLookup(sessionId)

  if (!lookup) {
    return null
  }

  const [projectResult, configResult] = await Promise.all([
    lookup.client
      .from("projects")
      .select("*")
      .eq("id", lookup.row.project_id)
      .single<ProjectRow>(),
    lookup.client
      .from("project_config_versions")
      .select("*")
      .eq("id", lookup.row.project_config_version_id)
      .single<ProjectConfigVersionRow>(),
  ])

  const configRow = expectData(
    configResult,
    "Unable to load session config version"
  )
  const projectRow = expectData(projectResult, "Unable to load session project")

  return {
    ...lookup,
    project: mapProject(projectRow, configRow.id, lookup.link.link_token),
    configRow,
    config: mapConfigVersion(configRow),
  }
}

async function getSessionTranscript(
  client: RepositoryClient,
  sessionId: string
) {
  const transcriptResult = await client
    .from("transcript_segments")
    .select("*")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true })

  return expectRows(transcriptResult, "Unable to load session transcript").map(
    (row) => mapTranscript(row as TranscriptSegmentRow)
  )
}

async function getSessionAnalysisContext(
  sessionId: string
): Promise<SessionAnalysisContext | null> {
  const runtimeBundle = await getParticipantSessionRuntimeBundle(sessionId)

  if (!runtimeBundle) {
    return null
  }

  return {
    ...runtimeBundle,
    transcript: await getSessionTranscript(runtimeBundle.client, sessionId),
  }
}

async function getLatestSessionOutputRow(
  client: RepositoryClient,
  sessionId: string
) {
  const result = await client
    .from("session_outputs_generated")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)

  return expectRows(
    result,
    "Unable to load latest generated session output"
  )[0] as SessionOutputGeneratedRow | undefined
}

async function getLatestProjectSessionOutputRows(
  client: SecretClient,
  projectId: string
) {
  const result = await client.rpc("get_latest_session_outputs_for_project", {
    target_project_id: projectId,
  })

  if (result.error) {
    fail(
      `Unable to load latest project session outputs: ${result.error.message}`
    )
  }

  return (result.data as SessionOutputGeneratedRow[] | null) ?? []
}

async function appendTranscriptSegments(
  client: SecretClient,
  sessionId: string,
  segments: TranscriptAppendSegmentRow[],
  runtimeState: SessionRuntimeState | null,
  lastActivityAt: string
) {
  const result = await client.rpc("append_session_events", {
    target_session_id: sessionId,
    transcript_segments_payload: segments,
    runtime_state_payload: runtimeState,
    activity_at: lastActivityAt,
  })

  if (result.error) {
    fail(`Unable to append transcript segments: ${result.error.message}`)
  }

  return ((result.data as TranscriptSegmentRow[] | null) ?? []).map((row) =>
    mapTranscript(row)
  )
}

function mergeRuntimeStatePatch(
  session: ParticipantSession,
  config: ProjectConfigVersion,
  patch: SessionRuntimePatch
): SessionRuntimeState {
  const nextState: SessionRuntimeState = {
    ...session.runtimeState,
  }

  if (patch.state) {
    nextState.state = patch.state
  }

  if (patch.activeQuestionId !== undefined) {
    nextState.activeQuestionId = patch.activeQuestionId ?? undefined
  }

  if (Array.isArray(patch.askedQuestionIds)) {
    nextState.askedQuestionIds = patch.askedQuestionIds
      .map((questionId) => questionId.trim())
      .filter(Boolean)
  }

  if (Array.isArray(patch.remainingQuestionIds)) {
    nextState.remainingQuestionIds = patch.remainingQuestionIds
      .map((questionId) => questionId.trim())
      .filter(Boolean)
  }

  if (
    typeof patch.followUpCount === "number" &&
    Number.isFinite(patch.followUpCount)
  ) {
    nextState.followUpCount = Math.max(0, Math.round(patch.followUpCount))
  }

  if (
    typeof patch.elapsedSeconds === "number" &&
    Number.isFinite(patch.elapsedSeconds)
  ) {
    nextState.elapsedSeconds = Math.max(0, Math.round(patch.elapsedSeconds))
  }

  if (
    typeof patch.questionElapsedSeconds === "number" &&
    Number.isFinite(patch.questionElapsedSeconds)
  ) {
    nextState.questionElapsedSeconds = Math.max(
      0,
      Math.round(patch.questionElapsedSeconds)
    )
  }

  if (
    typeof patch.noveltyScore === "number" &&
    Number.isFinite(patch.noveltyScore)
  ) {
    nextState.noveltyScore = Math.max(0, Math.min(1, patch.noveltyScore))
  }

  if (
    typeof patch.repetitionScore === "number" &&
    Number.isFinite(patch.repetitionScore)
  ) {
    nextState.repetitionScore = Math.max(0, Math.min(1, patch.repetitionScore))
  }

  if (
    typeof patch.coverageConfidence === "number" &&
    Number.isFinite(patch.coverageConfidence)
  ) {
    nextState.coverageConfidence = Math.max(
      0,
      Math.min(1, patch.coverageConfidence)
    )
  }

  if (
    typeof patch.introDeliveredAt === "string" &&
    patch.introDeliveredAt.trim()
  ) {
    nextState.introDeliveredAt = patch.introDeliveredAt
  }

  if (
    typeof patch.readinessDetectedAt === "string" &&
    patch.readinessDetectedAt.trim()
  ) {
    nextState.readinessDetectedAt = patch.readinessDetectedAt
  }

  if (
    typeof patch.interviewStartedAt === "string" &&
    patch.interviewStartedAt.trim()
  ) {
    nextState.interviewStartedAt = patch.interviewStartedAt
    const interviewStartedAt = new Date(patch.interviewStartedAt)

    if (!Number.isNaN(interviewStartedAt.getTime())) {
      nextState.hardStopAt = new Date(
        interviewStartedAt.getTime() + config.durationCapMinutes * 60 * 1000
      ).toISOString()
    }
  }

  if (patch.pausedAt !== undefined) {
    nextState.pausedAt = patch.pausedAt ?? undefined
  }

  return nextState
}

async function releaseStaleAnalysisJobs(lockTimeoutMinutes = 15) {
  const client = requireSecretClient()
  const result = await client.rpc("release_stale_analysis_jobs", {
    lock_timeout_minutes: lockTimeoutMinutes,
  })

  if (result.error) {
    fail(`Unable to release stale analysis jobs: ${result.error.message}`)
  }

  return (result.data as AnalysisJobRow[] | null)?.map(mapAnalysisJob) ?? []
}

async function claimAnalysisJobs(limit = 4, workerName = "gather-dispatch") {
  const client = requireSecretClient()
  const result = await client.rpc("claim_analysis_jobs", {
    worker_name: workerName,
    max_jobs: limit,
  })

  if (result.error) {
    fail(`Unable to claim analysis jobs: ${result.error.message}`)
  }

  return (result.data as AnalysisJobRow[] | null)?.map(mapAnalysisJob) ?? []
}

const SESSION_ANALYSIS_JOB_PRIORITY: Record<AnalysisJobType, number> = {
  transcript_cleaning: 0,
  session_extraction: 1,
  quality_scoring: 2,
  project_synthesis: 3,
}

function sortAnalysisJobs(jobs: AnalysisJob[]) {
  return [...jobs].sort((left, right) => {
    const priorityDelta =
      SESSION_ANALYSIS_JOB_PRIORITY[left.type] -
      SESSION_ANALYSIS_JOB_PRIORITY[right.type]

    if (priorityDelta !== 0) {
      return priorityDelta
    }

    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    )
  })
}

async function claimQueuedSessionAnalysisJobs(
  sessionId: string,
  workerName = "gather-session-dispatch"
) {
  const client = requireSecretClient()
  const queuedResult = await client
    .from("analysis_jobs")
    .select("*")
    .eq("session_id", sessionId)
    .in("job_type", SESSION_ANALYSIS_JOB_TYPES)
    .eq("status", "queued")
    .order("created_at", { ascending: true })

  const queuedJobs = sortAnalysisJobs(
    expectRows(queuedResult, "Unable to load queued session analysis jobs").map(
      (row) => mapAnalysisJob(row as AnalysisJobRow)
    )
  )

  if (queuedJobs.length === 0) {
    return []
  }

  const claimedAt = new Date().toISOString()
  const claimResult = await client
    .from("analysis_jobs")
    .update({
      status: "processing",
      claimed_by: workerName,
      claimed_at: claimedAt,
    })
    .in(
      "id",
      queuedJobs.map((job) => job.id)
    )
    .eq("status", "queued")
    .select("*")

  return sortAnalysisJobs(
    expectRows(claimResult, "Unable to claim queued session analysis jobs").map(
      (row) => mapAnalysisJob(row as AnalysisJobRow)
    )
  )
}

async function claimQueuedProjectSynthesisJobs(
  projectId: string,
  workerName = "gather-session-dispatch"
) {
  const client = requireSecretClient()
  const queuedResult = await client
    .from("analysis_jobs")
    .select("*")
    .eq("project_id", projectId)
    .eq("job_type", "project_synthesis")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)

  const queuedJobs = expectRows(
    queuedResult,
    "Unable to load queued project synthesis jobs"
  ).map((row) => mapAnalysisJob(row as AnalysisJobRow))

  if (queuedJobs.length === 0) {
    return []
  }

  const claimedAt = new Date().toISOString()
  const claimResult = await client
    .from("analysis_jobs")
    .update({
      status: "processing",
      claimed_by: workerName,
      claimed_at: claimedAt,
    })
    .in(
      "id",
      queuedJobs.map((job) => job.id)
    )
    .eq("status", "queued")
    .select("*")

  return expectRows(
    claimResult,
    "Unable to claim queued project synthesis jobs"
  ).map((row) => mapAnalysisJob(row as AnalysisJobRow))
}

async function completeAnalysisJob(jobId: string) {
  const client = requireSecretClient()
  const result = await client
    .from("analysis_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      claimed_at: null,
      claimed_by: null,
      last_error: null,
    })
    .eq("id", jobId)

  if (result.error) {
    fail(`Unable to complete analysis job ${jobId}: ${result.error.message}`)
  }
}

async function failAnalysisJob(job: AnalysisJob, message: string) {
  const client = requireSecretClient()
  const attempts = job.attempts + 1
  const status = attempts >= job.maxAttempts ? "failed" : "queued"
  const nextAttemptAt =
    status === "queued"
      ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
      : job.nextAttemptAt

  const result = await client
    .from("analysis_jobs")
    .update({
      status,
      attempts,
      next_attempt_at: nextAttemptAt,
      claimed_at: null,
      claimed_by: null,
      last_error: message,
    })
    .eq("id", job.id)

  if (result.error) {
    fail(
      `Unable to mark analysis job ${job.id} as failed: ${result.error.message}`
    )
  }
}

async function persistSessionOutput(
  session: ParticipantSession,
  project: ProjectRecord,
  config: ProjectConfigVersion,
  transcript: TranscriptSegment[]
) {
  const client = requireSecretClient()

  const promptVersionId = await ensurePromptVersion(
    client,
    project.workspaceId,
    "session-output/v3",
    "1",
    SESSION_OUTPUT_PROMPT_VERSION_TEXT
  )
  const modelVersionId = await ensureModelVersion(
    client,
    project.workspaceId,
    "session-output/v3",
    "openai",
    openAiModels.sessionEnrichment
  )
  const output = await generateSessionOutputAnalysis({
    project,
    session,
    config,
    transcript,
  })

  const result = await client
    .from("session_outputs_generated")
    .insert({
      session_id: session.id,
      cleaned_transcript: output.cleanedTranscript,
      payload: {
        summary: output.summary,
        questionAnswers: output.questionAnswers,
        questionReviews: output.questionReviews,
        themes: output.themes,
        painPoints: output.painPoints,
        opportunities: output.opportunities,
        risks: output.risks,
        keyQuotes: output.keyQuotes,
        quoteLibrary: output.quoteLibrary,
        insightCards: output.insightCards,
        tensions: output.tensions,
        unresolvedQuestions: output.unresolvedQuestions,
        projectImplications: output.projectImplications,
        recommendedActions: output.recommendedActions,
        analysisWarnings: output.analysisWarnings,
        confidenceScore: output.confidenceScore,
        respondentProfile: output.respondentProfile,
      },
      prompt_version_id: promptVersionId,
      model_version_id: modelVersionId,
    })
    .select("*")
    .single<SessionOutputGeneratedRow>()

  return mapGeneratedOutput(
    expectData(result, "Unable to persist session output")
  )
}

async function persistQualityScore(
  session: ParticipantSession,
  project: ProjectRecord,
  config: ProjectConfigVersion,
  transcript: TranscriptSegment[]
) {
  const client = requireSecretClient()
  const [generatedResult] = await Promise.all([
    client
      .from("session_outputs_generated")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ])
  const generatedOutputRow = expectRows(
    generatedResult,
    "Quality scoring requires a generated session output."
  )[0] as SessionOutputGeneratedRow | undefined

  if (!generatedOutputRow) {
    fail("Quality scoring requires a generated session output.")
  }

  const generatedOutput = mapGeneratedOutput(generatedOutputRow)
  const promptVersionId = await ensurePromptVersion(
    client,
    project.workspaceId,
    "quality-score/v3",
    "1",
    QUALITY_SCORE_PROMPT_VERSION_TEXT
  )
  const modelVersionId = await ensureModelVersion(
    client,
    project.workspaceId,
    "quality-score/v3",
    "openai",
    openAiModels.sessionGrader
  )
  const quality = await evaluateSessionQualityAnalysis({
    project,
    session,
    config,
    transcript,
    output: generatedOutput,
  })
  const effectiveLowQuality =
    typeof session.qualityOverride?.lowQuality === "boolean"
      ? session.qualityOverride.lowQuality
      : quality.lowQuality

  const [qualityResult, sessionResult] = await Promise.all([
    client
      .from("quality_scores")
      .upsert(
        {
          session_id: session.id,
          overall: quality.overall,
          low_quality: quality.lowQuality,
          scorer_source: quality.scorerSource,
          dimensions: quality.dimensions,
        },
        { onConflict: "session_id" }
      )
      .select("*")
      .single<QualityScoreRow>(),
    client
      .from("participant_sessions")
      .update({
        quality_flag: effectiveLowQuality,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", session.id),
  ])

  if (sessionResult.error) {
    fail(
      `Unable to update session quality flag: ${sessionResult.error.message}`
    )
  }

  const score = mapQualityScore(
    expectData(qualityResult, "Unable to persist quality score")
  )

  return {
    ...score,
    promptVersionId,
    modelVersionId,
  }
}

async function persistProjectSynthesis(projectId: string) {
  const client = requireSecretClient()
  const projectResult = await client
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single<ProjectRow>()
  const projectRow = expectData(
    projectResult,
    "Unable to load project for synthesis"
  )
  const workspaceId = projectRow.workspace_id

  const [configRows, linkRows, sessionRows] = await Promise.all([
    client
      .from("project_config_versions")
      .select("*")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false }),
    client
      .from("project_public_links")
      .select("*")
      .eq("project_id", projectId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    client
      .from("participant_sessions")
      .select("*")
      .eq("project_id", projectId)
      .order("started_at", { ascending: false }),
  ])

  const configRow = expectRows(configRows, "Unable to load project configs")[0]
  const linkRow = expectRows(linkRows, "Unable to load project links")[0]
  const sessions = expectRows(
    sessionRows,
    "Unable to load project sessions"
  ).map((row) =>
    mapSession(row as ParticipantSessionRow, linkRow?.link_token ?? "")
  )
  const sessionIds = sessions.map((session) => session.id)
  const [outputRows, overrideRows] = await Promise.all([
    getLatestProjectSessionOutputRows(client, projectId),
    sessionIds.length === 0
      ? Promise.resolve({
          data: [] as SessionOutputOverrideRow[],
          error: null,
        })
      : client
          .from("session_output_overrides")
          .select("*")
          .in("session_id", sessionIds),
  ])
  const overridesBySessionId = new Map(
    expectRows(overrideRows, "Unable to load session output overrides")
      .map((row) => mapOutputOverride(row as SessionOutputOverrideRow))
      .map((override) => [override.sessionId, override] as const)
  )
  const outputs = outputRows.map((row) =>
    mergeSessionOutputWithOverride(
      mapGeneratedOutput(row),
      overridesBySessionId.get(row.session_id)
    )
  )
  const promptVersionId = await ensurePromptVersion(
    client,
    workspaceId,
    "project-synthesis/v3",
    "1",
    PROJECT_SYNTHESIS_PROMPT_VERSION_TEXT
  )
  const modelVersionId = await ensureModelVersion(
    client,
    workspaceId,
    "project-synthesis/v3",
    "openai",
    openAiModels.projectSynthesis
  )
  const project = mapProject(
    projectRow,
    configRow?.id ?? "",
    linkRow?.link_token ?? ""
  )
  const synthesis = await generateProjectSynthesisAnalysis({
    project,
    sessions,
    outputs,
  })

  const result = await client
    .from("project_syntheses_generated")
    .insert({
      project_id: projectId,
      included_session_ids: synthesis.includedSessionIds,
      payload: {
        executiveSummary: synthesis.executiveSummary,
        crossInterviewThemes: synthesis.crossInterviewThemes,
        contradictionMap: synthesis.contradictionMap,
        alignmentSignals: synthesis.alignmentSignals,
        misalignmentSignals: synthesis.misalignmentSignals,
        topProblems: synthesis.topProblems,
        recommendedFocusAreas: synthesis.recommendedFocusAreas,
        notableQuotesByTheme: synthesis.notableQuotesByTheme,
        warning: synthesis.warning,
      },
      prompt_version_id: promptVersionId,
      model_version_id: modelVersionId,
    })
    .select("*")
    .single<ProjectSynthesisGeneratedRow>()

  return mapSynthesis(expectData(result, "Unable to persist project synthesis"))
}

async function processAnalysisJob(
  job: AnalysisJob,
  context?: SessionAnalysisContext
) {
  if (!job.sessionId && !job.projectId) {
    fail(`Analysis job ${job.id} is missing both session_id and project_id.`)
  }

  if (job.type === "project_synthesis") {
    await persistProjectSynthesis(job.projectId!)
    await completeAnalysisJob(job.id)
    return
  }

  const bundle =
    context?.session.id === job.sessionId
      ? context
      : await getSessionAnalysisContext(job.sessionId!)

  if (!bundle) {
    fail(`Session ${job.sessionId} was not found for analysis job ${job.id}.`)
  }

  if (job.type === "session_extraction") {
    await persistSessionOutput(
      bundle.session,
      bundle.project,
      bundle.config,
      bundle.transcript
    )
  }

  if (job.type === "quality_scoring") {
    await persistQualityScore(
      bundle.session,
      bundle.project,
      bundle.config,
      bundle.transcript
    )
  }

  await completeAnalysisJob(job.id)
}

async function enqueueProjectSynthesisJob(
  projectId: string,
  payload: Record<string, unknown> = { projectId }
) {
  const client = requireSecretClient()
  const result = await client
    .from("analysis_jobs")
    .insert({
      job_type: "project_synthesis",
      status: "queued",
      project_id: projectId,
      payload,
    })
    .select("*")
    .single<AnalysisJobRow>()

  return mapAnalysisJob(
    expectData(result, "Unable to enqueue project synthesis job")
  )
}

export async function processCompletedSessionAnalysis(
  sessionId: string,
  projectId: string,
  workerName = "gather-session-dispatch",
  context?: SessionAnalysisContext
) {
  const jobs = await claimQueuedSessionAnalysisJobs(sessionId, workerName)
  const processed: AnalysisJob[] = []
  let sessionJobFailed = false

  for (const job of jobs) {
    try {
      await processAnalysisJob(job, context)
      processed.push({ ...job, status: "completed" })
    } catch (error) {
      sessionJobFailed = true
      await failAnalysisJob(
        job,
        error instanceof Error ? error.message : "Analysis job failed."
      )
    }
  }

  if (sessionJobFailed || jobs.length === 0) {
    return processed
  }

  await enqueueProjectSynthesisJob(projectId, {
    projectId,
    sessionId,
    source: "session_completion",
  })

  const synthesisJobs = await claimQueuedProjectSynthesisJobs(
    projectId,
    workerName
  )

  for (const job of synthesisJobs) {
    try {
      await processAnalysisJob(job)
      processed.push({ ...job, status: "completed" })
    } catch (error) {
      await failAnalysisJob(
        job,
        error instanceof Error ? error.message : "Analysis job failed."
      )
    }
  }

  return processed
}

export async function getWorkspaceSnapshot() {
  const context = await getRequiredConsultantContext()
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const projectsResult = await client
    .from("projects")
    .select("*")
    .eq("workspace_id", context.workspace.id)
    .order("updated_at", { ascending: false })
  const projectRows = expectRows(
    projectsResult,
    "Unable to load projects"
  ) as ProjectRow[]
  const projectIds = projectRows.map((row) => row.id)
  const [configMap, linkMap, synthesisMap, sessionsResult] = await Promise.all([
    getLatestConfigVersions(client, projectIds),
    getLatestPublicLinks(client, projectIds),
    getLatestSyntheses(client, projectIds),
    projectIds.length === 0
      ? Promise.resolve({
          data: [] as ParticipantSessionListRow[],
          error: null,
        })
      : client
          .from("participant_sessions")
          .select(
            "id, project_id, respondent_label, status, quality_flag, excluded_from_synthesis, last_activity_at"
          )
          .in("project_id", projectIds),
  ])
  const sessionRows = expectRows(
    sessionsResult,
    "Unable to load participant sessions"
  ) as ParticipantSessionListRow[]
  const incompleteProjectIds = projectRows
    .filter((row) => !configMap.has(row.id) || !linkMap.has(row.id))
    .map((row) => row.id)

  if (incompleteProjectIds.length > 0) {
    fail(
      `Workspace snapshot found projects missing a current configuration or active public link: ${incompleteProjectIds.join(", ")}`
    )
  }

  const sessionSummaries = sessionRows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    respondentLabel: row.respondent_label,
    status: row.status,
    qualityFlag: row.quality_flag,
    excludedFromSynthesis: row.excluded_from_synthesis,
    lastActivityAt: row.last_activity_at,
  }))
  const sessionsByProjectId = groupByProjectId(sessionSummaries)

  const projects = projectRows.map((row) => {
    const config = configMap.get(row.id)!
    const link = linkMap.get(row.id)!
    const projectSessions = sessionsByProjectId.get(row.id) ?? []
    const synthesis = synthesisMap.get(row.id)
    const metrics = buildSessionMetrics(projectSessions)

    return {
      ...mapProject(row, config.id, link.link_token),
      sessionCounts: {
        inProgress: metrics.inProgress,
        completed: metrics.completed,
        abandoned: metrics.abandoned,
        flagged: metrics.flagged,
      },
      activeThemes: synthesis
        ? mapSynthesis(synthesis).crossInterviewThemes
        : [],
      includedSessions: metrics.includedInSynthesis,
    }
  })

  const projectNameById = new Map(projects.map((p) => [p.id, p.name]))
  const recentNeedsReviewSessions = buildRecentNeedsReviewSessions(
    sessionSummaries,
    projectNameById
  )

  return {
    workspace: buildWorkspaceSummary(
      context.workspace,
      context.profile,
      context.user
    ),
    projects,
    recentNeedsReviewSessions,
  }
}

export async function listProjects() {
  const context = await getRequiredConsultantContext()
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const projectsResult = await client
    .from("projects")
    .select("*")
    .eq("workspace_id", context.workspace.id)
    .order("updated_at", { ascending: false })

  const projectRows = expectRows(
    projectsResult,
    "Unable to load projects"
  ) as ProjectRow[]
  const projectIds = projectRows.map((row) => row.id)
  const [configMap, linkMap, sessionsResult] = await Promise.all([
    getLatestConfigVersions(client, projectIds),
    getLatestPublicLinks(client, projectIds),
    projectIds.length === 0
      ? Promise.resolve({
          data: [] as ParticipantSessionListRow[],
          error: null,
        })
      : client
          .from("participant_sessions")
          .select(
            "id, project_id, respondent_label, status, quality_flag, excluded_from_synthesis, last_activity_at"
          )
          .in("project_id", projectIds),
  ])
  const sessionSummaries = (
    expectRows(
      sessionsResult,
      "Unable to load participant sessions"
    ) as ParticipantSessionListRow[]
  ).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    respondentLabel: row.respondent_label,
    status: row.status,
    qualityFlag: row.quality_flag,
    excludedFromSynthesis: row.excluded_from_synthesis,
    lastActivityAt: row.last_activity_at,
  }))
  const sessionsByProjectId = groupByProjectId(sessionSummaries)

  return projectRows.map((row) => {
    const config = configMap.get(row.id)
    const link = linkMap.get(row.id)

    if (!config || !link) {
      fail(
        `Project list found project ${row.id} missing a current configuration or active public link.`
      )
    }

    const metrics = buildSessionMetrics(sessionsByProjectId.get(row.id) ?? [])

    return {
      ...mapProject(row, config.id, link.link_token),
      sessionCounts: {
        inProgress: metrics.inProgress,
        completed: metrics.completed,
        abandoned: metrics.abandoned,
        flagged: metrics.flagged,
      },
      includedSessions: metrics.includedInSynthesis,
    }
  })
}

export async function getProjectDetail(projectId: string) {
  const context = await getRequiredConsultantContext()
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const projectResult = await client
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle<ProjectRow>()

  if (projectResult.error) {
    fail(`Unable to load project detail: ${projectResult.error.message}`)
  }

  if (!projectResult.data) {
    return null
  }

  const [
    configResult,
    linkResult,
    sessionsResult,
    synthesesResult,
    synthesisOverrideResult,
    testimonialLinksResult,
    testimonialReviewsResult,
  ] = await Promise.all([
    client
      .from("project_config_versions")
      .select("*")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false }),
    client
      .from("project_public_links")
      .select("*")
      .eq("project_id", projectId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    client
      .from("participant_sessions")
      .select("*")
      .eq("project_id", projectId)
      .order("last_activity_at", { ascending: false }),
    client
      .from("project_syntheses_generated")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1),
    client
      .from("project_synthesis_overrides")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle<ProjectSynthesisOverrideRow>(),
    client
      .from("testimonial_links")
      .select("*")
      .eq("project_id", projectId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    client
      .from("testimonial_reviews")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ])

  const configRows = expectRows(
    configResult,
    "Unable to load config versions"
  ) as ProjectConfigVersionRow[]
  const configRow = configRows[0]
  const linkRow = expectRows(linkResult, "Unable to load public links")[0] as
    | ProjectPublicLinkRow
    | undefined

  if (!configRow || !linkRow) {
    fail(
      "Project detail is missing a current configuration or active public link."
    )
  }

  const project = mapProject(
    projectResult.data,
    configRow.id,
    linkRow.link_token
  )
  const configVersion = mapConfigVersion(configRow)
  const configHistory = configRows.map((row) => mapConfigVersion(row))
  const sessions = expectRows(
    sessionsResult,
    "Unable to load project sessions"
  ).map((row) => mapSession(row as ParticipantSessionRow, linkRow.link_token))
  const sessionIds = sessions.map((session) => session.id)
  const qualityResult =
    sessionIds.length === 0
      ? { data: [] as QualityScoreRow[], error: null }
      : await client
          .from("quality_scores")
          .select("*")
          .in("session_id", sessionIds)
  const synthesisRow = expectRows(
    synthesesResult,
    "Unable to load project synthesis"
  )[0] as ProjectSynthesisGeneratedRow | undefined
  const synthesis = synthesisRow ?? null
  const qualityScores = Object.fromEntries(
    expectRows(qualityResult, "Unable to load quality scores")
      .map((row) => mapQualityScore(row as QualityScoreRow))
      .map((score) => [score.sessionId, score])
  )
  const synthesisOverride = synthesisOverrideResult.data
    ? mapSynthesisOverride(synthesisOverrideResult.data)
    : undefined
  const generatedSynthesis = synthesis
    ? mapSynthesis(synthesis)
    : buildEmptyProjectSynthesis(project.id, "pending", "pending")

  return {
    project,
    configVersion,
    configHistory,
    sessions,
    synthesis: mergeSynthesisWithOverride(
      generatedSynthesis,
      synthesisOverride
    ),
    generatedSynthesis,
    synthesisOverride,
    qualityScores,
    testimonialLinks: expectRows(
      testimonialLinksResult,
      "Unable to load testimonial links"
    ).map((row) => mapTestimonialLink(row as TestimonialLinkRow)),
    testimonialReviews: expectRows(
      testimonialReviewsResult,
      "Unable to load testimonial reviews"
    ).map((row) => mapTestimonialReview(row as TestimonialReviewRow)),
  }
}

export async function getProjectClaimEvidence(
  projectId: string,
  kind: ProjectEvidenceClaimKind,
  claimId: string
): Promise<ProjectEvidenceDrawerPayload | null> {
  const context = await getRequiredConsultantContext()
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const projectResult = await client
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle<ProjectRow>()

  if (projectResult.error) {
    fail(`Unable to load project evidence: ${projectResult.error.message}`)
  }

  if (!projectResult.data) {
    return null
  }

  const synthesesResult = await client
    .from("project_syntheses_generated")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)

  const synthesisRow = expectRows(
    synthesesResult,
    "Unable to load project synthesis for evidence"
  )[0] as ProjectSynthesisGeneratedRow | undefined

  if (!synthesisRow) {
    return null
  }

  const synthesis = mapSynthesis(synthesisRow)
  const claim = getProjectEvidenceClaimDescriptor(synthesis, kind, claimId)

  if (!claim) {
    return null
  }

  const displayedEvidence = claim.evidence.slice(
    0,
    MAX_PROJECT_EVIDENCE_EXCERPTS
  )
  const referencedSessionIds = [
    ...new Set(displayedEvidence.map((ref) => ref.sessionId)),
  ]
  const referencedSegmentIds = [
    ...new Set(displayedEvidence.flatMap((ref) => ref.segmentIds)),
  ]
  const [sessionsResult, transcriptResult] = await Promise.all([
    referencedSessionIds.length === 0
      ? Promise.resolve({
          data: [] as Array<{ id: string; respondent_label: string }>,
          error: null,
        })
      : client
          .from("participant_sessions")
          .select("id, respondent_label")
          .in("id", referencedSessionIds),
    referencedSegmentIds.length === 0 || referencedSessionIds.length === 0
      ? Promise.resolve({ data: [] as TranscriptSegmentRow[], error: null })
      : client
          .from("transcript_segments")
          .select("*")
          .in("session_id", referencedSessionIds)
          .in("id", referencedSegmentIds),
  ])

  const sessions = expectRows(
    sessionsResult,
    "Unable to load project evidence sessions"
  ).map((row) => ({
    id: row.id,
    respondentLabel: row.respondent_label,
  }))
  const transcript = expectRows(
    transcriptResult,
    "Unable to load transcript evidence"
  ).map((row) => mapTranscript(row as TranscriptSegmentRow))

  return resolveProjectClaimEvidence({
    projectId,
    projectWorkspaceId: projectResult.data.workspace_id,
    viewerWorkspaceId: context.workspace.id,
    kind,
    claimId,
    synthesis,
    sessions,
    transcript,
  })
}

export async function getSessionReview(projectId: string, sessionId: string) {
  const context = await getRequiredConsultantContext()
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const projectResult = await client
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle<ProjectRow>()

  if (projectResult.error) {
    fail(
      `Unable to load session review project: ${projectResult.error.message}`
    )
  }

  if (!projectResult.data) {
    return null
  }

  const [
    configResult,
    linkResult,
    siblingSessionsResult,
    transcriptResult,
    generatedResult,
    overrideResult,
    jobsResult,
  ] = await Promise.all([
    client
      .from("project_config_versions")
      .select("*")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .limit(1),
    client
      .from("project_public_links")
      .select("*")
      .eq("project_id", projectId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1),
    client
      .from("participant_sessions")
      .select("*")
      .eq("project_id", projectId)
      .order("last_activity_at", { ascending: false }),
    client
      .from("transcript_segments")
      .select("*")
      .eq("session_id", sessionId)
      .order("order_index", { ascending: true }),
    client
      .from("session_outputs_generated")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1),
    client
      .from("session_output_overrides")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle<SessionOutputOverrideRow>(),
    client
      .from("analysis_jobs")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false }),
  ])

  if (generatedResult.error) {
    fail(`Unable to load generated output: ${generatedResult.error.message}`)
  }

  if (overrideResult.error) {
    fail(`Unable to load session override: ${overrideResult.error.message}`)
  }

  const configRow = expectRows(
    configResult,
    "Unable to load current project configuration"
  )[0] as ProjectConfigVersionRow | undefined
  const linkRow = expectRows(
    linkResult,
    "Unable to load active project link"
  )[0] as ProjectPublicLinkRow | undefined

  if (!configRow || !linkRow) {
    fail(
      "Session review is missing the current project configuration or active link."
    )
  }

  const configVersion = mapConfigVersion(configRow)
  const project = mapProject(
    projectResult.data,
    configRow.id,
    linkRow.link_token
  )
  const siblingSessions = expectRows(
    siblingSessionsResult,
    "Unable to load project sessions"
  ).map((row) => mapSession(row as ParticipantSessionRow, linkRow.link_token))
  const session = siblingSessions.find((item) => item.id === sessionId)

  if (!session) {
    return null
  }

  const siblingSessionIds = siblingSessions.map((item) => item.id)
  const qualityResult =
    siblingSessionIds.length === 0
      ? { data: [] as QualityScoreRow[], error: null }
      : await client
          .from("quality_scores")
          .select("*")
          .in("session_id", siblingSessionIds)

  const qualityScoresBySessionId = Object.fromEntries(
    expectRows(qualityResult, "Unable to load session quality scores")
      .map((row) => mapQualityScore(row as QualityScoreRow))
      .map((score) => [score.sessionId, score] as const)
  )

  const analysisJobs = expectRows(
    jobsResult,
    "Unable to load session analysis jobs"
  ).map((row) => mapAnalysisJob(row as AnalysisJobRow))
  const latestGeneratedRow = expectRows(
    generatedResult,
    "Unable to load generated output rows"
  )[0] as SessionOutputGeneratedRow | undefined
  const override = overrideResult.data
    ? mapOutputOverride(overrideResult.data)
    : undefined
  const generatedOutput = latestGeneratedRow
    ? mapGeneratedOutput(latestGeneratedRow)
    : buildGeneratedOutputPlaceholder(session, configVersion)
  const effectiveOutput = mergeSessionOutputWithOverride(
    generatedOutput,
    override
  )
  const sessionJobFailures = analysisJobs.filter(
    (job) =>
      (job.type === "transcript_cleaning" ||
        job.type === "session_extraction" ||
        job.type === "quality_scoring") &&
      job.status === "failed"
  )
  const sessionJobsPending = analysisJobs.some(
    (job) =>
      (job.type === "transcript_cleaning" ||
        job.type === "session_extraction" ||
        job.type === "quality_scoring") &&
      (job.status === "queued" || job.status === "processing")
  )
  const generatedStatus: "ready" | "failed" | "pending" | "idle" =
    latestGeneratedRow
      ? "ready"
      : sessionJobFailures.some(
            (job) =>
              job.type === "transcript_cleaning" ||
              job.type === "session_extraction"
          )
        ? "failed"
        : sessionJobsPending || session.status === "complete"
          ? "pending"
          : "idle"
  const qualityStatus: "ready" | "failed" | "pending" | "idle" =
    qualityResult.data
      ? "ready"
      : sessionJobFailures.some((job) => job.type === "quality_scoring")
        ? "failed"
        : sessionJobsPending || session.status === "complete"
          ? "pending"
          : "idle"
  const transcript = expectRows(
    transcriptResult,
    "Unable to load transcript"
  ).map((row) => mapTranscript(row as TranscriptSegmentRow))
  const transcriptStatus: "ready" | "failed" | "pending" | "empty" =
    transcript.length > 0
      ? "ready"
      : generatedStatus === "failed"
        ? "failed"
        : generatedStatus === "pending"
          ? "pending"
          : session.status === "complete"
            ? "empty"
            : "pending"
  const analysisFailure = sessionJobFailures[0]?.lastError

  return {
    project,
    configVersion,
    session,
    qualityOverride: session.qualityOverride,
    transcript,
    transcriptStatus,
    generatedStatus,
    qualityStatus,
    analysisFailure,
    analysisJobs,
    generatedOutput,
    effectiveOutput,
    override,
    qualityScore: qualityScoresBySessionId[sessionId],
    siblingSessions,
    siblingQualityScores: qualityScoresBySessionId,
  }
}

export async function getPublicInterviewConfig(linkToken: string) {
  const bundle = await getProjectBundleByLinkToken(linkToken)

  if (!bundle) {
    return null
  }

  if (normalizeProjectType(bundle.project.project_type) === "testimonial") {
    return null
  }

  return buildPublicInterviewConfig(bundle)
}

export async function getPublicTestimonialConfig(
  linkToken: string
): Promise<PublicTestimonialConfig | null> {
  const client = requireSecretClient()
  const linkResult = await client
    .from("testimonial_links")
    .select("*")
    .eq("link_token", linkToken)
    .is("revoked_at", null)
    .maybeSingle<TestimonialLinkRow>()

  if (linkResult.error) {
    fail(`Unable to load testimonial link: ${linkResult.error.message}`)
  }

  if (!linkResult.data) {
    return null
  }

  return {
    projectId: linkResult.data.project_id,
    linkId: linkResult.data.id,
    linkToken: linkResult.data.link_token,
    businessName: linkResult.data.business_name,
    websiteUrl: linkResult.data.website_url,
    brandColor: linkResult.data.brand_color,
    headline: linkResult.data.headline,
    prompt: linkResult.data.prompt,
  }
}

export async function submitTestimonialReview(
  linkToken: string,
  input: {
    transcript: string
    reviewerName?: string
    rating: number
    suggestedRating?: number | null
  }
) {
  const config = await getPublicTestimonialConfig(linkToken)

  if (!config) {
    return null
  }

  const transcript = truncateReviewText(input.transcript)
  const rating = parseTestimonialRating(input.rating)
  const suggestedRating = parseTestimonialRating(input.suggestedRating)
  const reviewerName = truncateReviewText(input.reviewerName, 120)

  if (!transcript || !rating) {
    fail("A written review and star rating are required.")
  }

  const client = requireSecretClient()
  const result = await client
    .from("testimonial_reviews")
    .insert({
      project_id: config.projectId,
      testimonial_link_id: config.linkId,
      transcript,
      reviewer_name: reviewerName || null,
      suggested_rating: suggestedRating,
      rating,
      status: "pending",
    })
    .select("*")
    .single<TestimonialReviewRow>()

  return mapTestimonialReview(
    expectData(result, "Unable to submit testimonial review")
  )
}

export async function getPublicTestimonialEmbed(projectId: string, limit = 20) {
  const client = requireSecretClient()
  const boundedLimit = Math.max(1, Math.min(20, Math.round(limit)))
  const [projectResult, linksResult, reviewsResult] = await Promise.all([
    client
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("project_type", "testimonial")
      .maybeSingle<ProjectRow>(),
    client
      .from("testimonial_links")
      .select("*")
      .eq("project_id", projectId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    client
      .from("testimonial_reviews")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(boundedLimit),
  ])

  if (projectResult.error) {
    fail(`Unable to load testimonial project: ${projectResult.error.message}`)
  }

  if (!projectResult.data) {
    return null
  }

  const links = expectRows(
    linksResult,
    "Unable to load testimonial embed links"
  ).map((row) => mapTestimonialLink(row as TestimonialLinkRow))
  const activeLink = links[0]

  if (!activeLink) {
    return null
  }

  return {
    project: projectResult.data,
    link: activeLink,
    reviews: expectRows(
      reviewsResult,
      "Unable to load approved testimonial reviews"
    ).map((row) => mapTestimonialReview(row as TestimonialReviewRow)),
  }
}

export async function updateTestimonialReviewStatus(input: {
  projectId: string
  reviewId: string
  status: TestimonialReviewStatus
}) {
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const result = await client
    .from("testimonial_reviews")
    .update({
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", input.projectId)
    .eq("id", input.reviewId)
    .select("*")
    .single<TestimonialReviewRow>()

  return mapTestimonialReview(
    expectData(result, "Unable to update testimonial review status")
  )
}

export async function createTestimonialLink(input: {
  projectId: string
  businessName: string
  websiteUrl: string
  brandColor: string
  headline: string
  prompt: string
}) {
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const projectResult = await client
    .from("projects")
    .select("*")
    .eq("id", input.projectId)
    .single<ProjectRow>()
  const project = expectData(
    projectResult,
    "Unable to load testimonial project"
  )

  if (normalizeProjectType(project.project_type) !== "testimonial") {
    fail("Review links can only be created for testimonial projects.")
  }

  const websiteUrl = normalizeWebsiteUrl(input.websiteUrl)

  if (!websiteUrl) {
    fail("A valid website URL is required for testimonial links.")
  }

  const result = await client
    .from("testimonial_links")
    .insert({
      project_id: input.projectId,
      link_token: `test-${crypto.randomUUID()}`,
      business_name: normalizeOptionalText(input.businessName, project.name),
      website_url: websiteUrl,
      brand_color: normalizeBrandColor(input.brandColor),
      headline: normalizeOptionalText(
        input.headline,
        DEFAULT_TESTIMONIAL_HEADLINE
      ),
      prompt: normalizeOptionalText(input.prompt, DEFAULT_TESTIMONIAL_PROMPT),
    })
    .select("*")
    .single<TestimonialLinkRow>()

  return mapTestimonialLink(
    expectData(result, "Unable to create testimonial link")
  )
}

export async function createParticipantSession(
  linkToken: string,
  metadata: Record<string, string> = {}
) {
  const started = await startParticipantSession(linkToken, metadata)

  if (!started) {
    return null
  }

  return {
    session: started.session,
    recoveryToken: started.recoveryToken,
  }
}

export async function startParticipantSession(
  linkToken: string,
  metadata: Record<string, string> = {}
) {
  const bundle = await getProjectBundleByLinkToken(linkToken)

  if (!bundle) {
    return null
  }

  if (normalizeProjectType(bundle.project.project_type) === "testimonial") {
    return null
  }

  const now = new Date()
  const startedAt = now.toISOString()
  const resumeExpiresAt = new Date(
    now.getTime() + DEFAULT_RESUME_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString()
  const runtimeState = buildInitialRuntimeState(bundle.config, now)
  const insertResult = await bundle.client
    .from("participant_sessions")
    .insert({
      project_id: bundle.project.id,
      project_config_version_id: bundle.config.id,
      public_link_id: bundle.link.id,
      respondent_label:
        bundle.config.anonymityMode === "named"
          ? "Respondent"
          : getAnonymousRespondentLabel(bundle.project.project_type),
      status: "in_progress",
      metadata,
      quality_flag: false,
      excluded_from_synthesis: false,
      runtime_state: runtimeState,
      started_at: startedAt,
      last_activity_at: startedAt,
      resume_expires_at: resumeExpiresAt,
    })
    .select("*")
    .single<ParticipantSessionRow>()

  const session = mapSession(
    expectData(insertResult, "Unable to create participant session"),
    bundle.link.link_token
  )

  return {
    session,
    recoveryToken: signRecoveryToken(session.id, resumeExpiresAt),
    publicConfig: buildPublicInterviewConfig(bundle),
  }
}

export async function resumeParticipantSession(
  sessionId: string,
  token: string
) {
  const lookup = await getParticipantSessionLookup(sessionId)

  if (!lookup) {
    return null
  }

  if (!verifyRecoveryToken(token, sessionId)) {
    return null
  }

  if (new Date(lookup.session.resumeExpiresAt).getTime() < Date.now()) {
    return null
  }

  return lookup.session
}

export async function appendSessionEvents(
  sessionId: string,
  payload: {
    segments?: Omit<
      TranscriptSegment,
      "id" | "createdAt" | "orderIndex" | "sessionId"
    >[]
    runtime?: SessionRuntimePatch
  }
) {
  const bundle = await getParticipantSessionRuntimeBundle(sessionId)

  if (!bundle) {
    return null
  }

  const segments = payload.segments ?? []
  const createdAt = new Date().toISOString()
  const updatedRuntimeState = payload.runtime
    ? mergeRuntimeStatePatch(bundle.session, bundle.config, payload.runtime)
    : null

  return appendTranscriptSegments(
    bundle.client,
    sessionId,
    segments.map((segment) => ({
      source_item_id: segment.sourceItemId ?? null,
      speaker: segment.speaker,
      content: segment.text,
      start_offset_ms: segment.startOffsetMs ?? null,
      end_offset_ms: segment.endOffsetMs ?? null,
    })),
    updatedRuntimeState,
    createdAt
  )
}

export async function completeParticipantSession(
  sessionId: string,
  runtimePatch?: Pick<
    SessionRuntimePatch,
    "elapsedSeconds" | "questionElapsedSeconds"
  >
) {
  const bundle = await getParticipantSessionRuntimeBundle(sessionId)

  if (!bundle) {
    return null
  }

  if (bundle.session.status === "complete") {
    return {
      session: bundle.session,
      jobs: [],
      analysisContext: {
        ...bundle,
        transcript: await getSessionTranscript(bundle.client, sessionId),
      } satisfies SessionAnalysisContext,
    }
  }

  const completedAt = new Date().toISOString()
  const updatedRuntimeState = mergeRuntimeStatePatch(
    bundle.session,
    bundle.config,
    {
      ...runtimePatch,
      state: "complete",
      pausedAt: null,
    }
  )

  const [sessionResult, jobsResult] = await Promise.all([
    bundle.client
      .from("participant_sessions")
      .update({
        status: "complete",
        completed_at: completedAt,
        last_activity_at: completedAt,
        runtime_state: updatedRuntimeState,
      })
      .eq("id", sessionId)
      .select("*")
      .single<ParticipantSessionRow>(),
    bundle.client
      .from("analysis_jobs")
      .insert(
        SESSION_ANALYSIS_JOB_TYPES.map((jobType) => ({
          job_type: jobType,
          status: "queued",
          project_id: bundle.session.projectId,
          session_id: bundle.session.id,
          payload: {
            projectId: bundle.session.projectId,
            sessionId: bundle.session.id,
          },
        }))
      )
      .select("*"),
  ])

  return {
    session: mapSession(
      expectData(sessionResult, "Unable to complete participant session"),
      bundle.link.link_token
    ),
    jobs: expectRows(jobsResult, "Unable to enqueue analysis jobs").map((row) =>
      mapAnalysisJob(row as AnalysisJobRow)
    ),
    analysisContext: {
      ...bundle,
      transcript: await getSessionTranscript(bundle.client, sessionId),
    } satisfies SessionAnalysisContext,
  }
}

export async function getParticipantSession(sessionId: string) {
  const lookup = await getParticipantSessionLookup(sessionId)
  return lookup?.session ?? null
}

export async function getParticipantRealtimeConfig(sessionId: string) {
  const bundle = await getParticipantSessionRuntimeBundle(sessionId)

  if (!bundle) {
    return { status: "missing_session" as const }
  }

  if (!bundle.link || bundle.link.revoked_at) {
    return { status: "missing_link" as const }
  }

  const projectResult = await bundle.client
    .from("projects")
    .select("*")
    .eq("id", bundle.session.projectId)
    .single<ProjectRow>()

  return {
    status: "ready" as const,
    publicConfig: buildPublicInterviewConfig({
      project: expectData(projectResult, "Unable to load session project"),
      config: bundle.config,
    }),
  }
}

async function loadSessionAnalysisArtifacts(
  client: SecretClient,
  sessionId: string
) {
  const [generatedRow, qualityResult] = await Promise.all([
    getLatestSessionOutputRow(client, sessionId),
    client
      .from("quality_scores")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle<QualityScoreRow>(),
  ])

  if (qualityResult.error) {
    fail(`Unable to load quality score: ${qualityResult.error.message}`)
  }

  return {
    outputs: generatedRow ? mapGeneratedOutput(generatedRow) : undefined,
    score: qualityResult.data ? mapQualityScore(qualityResult.data) : undefined,
  }
}

export async function getSessionAnalysisTracePayloadFromContext(
  context: SessionAnalysisContext
) {
  const artifacts = await loadSessionAnalysisArtifacts(
    context.client,
    context.session.id
  )

  return {
    session: context.session,
    transcript: context.transcript,
    ...artifacts,
  }
}

export async function getSessionAnalysisTracePayload(sessionId: string) {
  const bundle = await getSessionAnalysisContext(sessionId)

  if (!bundle) {
    return null
  }

  return getSessionAnalysisTracePayloadFromContext(bundle)
}

export async function createProjectFromForm(input: {
  projectType: string
  name: string
  objective: string
  areasOfInterest: string
  requiredQuestions: string
  durationCapMinutes: number
  anonymityMode: string
  testimonialBusinessName?: string
  testimonialWebsiteUrl?: string
  testimonialBrandColor?: string
  testimonialHeadline?: string
  testimonialPrompt?: string
}) {
  const context = await getRequiredConsultantContext()
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const slug = await ensureProjectSlug(client, context.workspace.id, input.name)
  const normalizedInput = normalizeProjectCreateInput(input, slug)
  const createdProject =
    (await createProjectGraphViaRpc(
      client,
      context.workspace.id,
      normalizedInput
    )) ??
    (await createProjectGraphLegacy(
      client,
      context.workspace.id,
      normalizedInput
    ))

  if (normalizedInput.projectType === "testimonial") {
    if (!normalizedInput.testimonial) {
      fail("Testimonial project setup is missing link settings.")
    }

    await createInitialTestimonialLink(
      client,
      createdProject.projectRow.id,
      normalizedInput.testimonial
    )
  }

  return {
    project: mapProject(
      createdProject.projectRow,
      createdProject.configRow.id,
      createdProject.publicLinkToken
    ),
    configVersion: mapConfigVersion(createdProject.configRow),
  }
}

export async function enqueueSynthesisRefresh(projectId: string) {
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const result = await client
    .from("analysis_jobs")
    .insert({
      job_type: "project_synthesis",
      status: "queued",
      project_id: projectId,
      payload: { projectId, manual: true },
    })
    .select("*")
    .single<AnalysisJobRow>()

  return mapAnalysisJob(
    expectData(result, "Unable to enqueue synthesis refresh")
  )
}

export async function setSessionExcludedFromSynthesis(
  sessionId: string,
  excluded: boolean
) {
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const [sessionResult, linkResult] = await Promise.all([
    client
      .from("participant_sessions")
      .update({ excluded_from_synthesis: excluded })
      .eq("id", sessionId)
      .select("*")
      .single<ParticipantSessionRow>(),
    client
      .from("participant_sessions")
      .select("public_link_id")
      .eq("id", sessionId)
      .single<{ public_link_id: string }>(),
  ])

  const publicLinkId = expectData(
    linkResult,
    "Unable to inspect participant session link"
  ).public_link_id
  const publicLinkResult = await client
    .from("project_public_links")
    .select("link_token")
    .eq("id", publicLinkId)
    .single<{ link_token: string }>()

  return mapSession(
    expectData(sessionResult, "Unable to update session synthesis exclusion"),
    expectData(publicLinkResult, "Unable to load public link token").link_token
  )
}

export async function saveSessionOverride(
  sessionId: string,
  editedSummary: string,
  consultantNotes: string
) {
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const existingResult = await client
    .from("session_output_overrides")
    .select("suppressed_claim_ids")
    .eq("session_id", sessionId)
    .maybeSingle<{ suppressed_claim_ids: unknown }>()

  if (existingResult.error) {
    fail(
      `Unable to inspect existing session override: ${existingResult.error.message}`
    )
  }

  const result = await client
    .from("session_output_overrides")
    .upsert(
      {
        session_id: sessionId,
        edited_summary: editedSummary,
        consultant_notes: consultantNotes,
        suppressed_claim_ids: safeStringArray(
          existingResult.data?.suppressed_claim_ids
        ),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    )
    .select("*")
    .single<SessionOutputOverrideRow>()

  return mapOutputOverride(
    expectData(result, "Unable to save session override")
  )
}

export async function saveSessionClaimSuppression(
  sessionId: string,
  claimId: string,
  suppressed: boolean
) {
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const existingResult = await client
    .from("session_output_overrides")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle<SessionOutputOverrideRow>()

  if (existingResult.error) {
    fail(
      `Unable to inspect existing session override: ${existingResult.error.message}`
    )
  }

  const existingSuppressedIds = safeStringArray(
    existingResult.data?.suppressed_claim_ids
  )
  const nextSuppressedIds = suppressed
    ? Array.from(new Set([...existingSuppressedIds, claimId]))
    : existingSuppressedIds.filter((id) => id !== claimId)

  const result = await client
    .from("session_output_overrides")
    .upsert(
      {
        session_id: sessionId,
        edited_summary: existingResult.data?.edited_summary ?? "",
        consultant_notes: existingResult.data?.consultant_notes ?? "",
        suppressed_claim_ids: nextSuppressedIds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    )
    .select("*")
    .single<SessionOutputOverrideRow>()

  return mapOutputOverride(
    expectData(result, "Unable to update suppressed session claims")
  )
}

export async function saveSessionQualityOverride(input: {
  sessionId: string
  mode: "generated" | "manual"
  lowQuality?: boolean
  note: string
}) {
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const [latestQualityResult, sessionLinkResult] = await Promise.all([
    client
      .from("quality_scores")
      .select("low_quality")
      .eq("session_id", input.sessionId)
      .maybeSingle<{ low_quality: boolean }>(),
    client
      .from("participant_sessions")
      .select("public_link_id")
      .eq("id", input.sessionId)
      .single<{ public_link_id: string }>(),
  ])

  if (latestQualityResult.error) {
    fail(
      `Unable to inspect generated quality score: ${latestQualityResult.error.message}`
    )
  }

  const now = new Date().toISOString()
  const updatePayload =
    input.mode === "manual"
      ? {
          manual_quality_flag: Boolean(input.lowQuality),
          quality_override_note: input.note.trim(),
          quality_override_updated_at: now,
          quality_flag: Boolean(input.lowQuality),
          last_activity_at: now,
        }
      : {
          manual_quality_flag: null,
          quality_override_note: "",
          quality_override_updated_at: null,
          quality_flag: latestQualityResult.data?.low_quality ?? false,
          last_activity_at: now,
        }

  const sessionResult = await client
    .from("participant_sessions")
    .update(updatePayload)
    .eq("id", input.sessionId)
    .select("*")
    .single<ParticipantSessionRow>()

  const publicLinkId = expectData(
    sessionLinkResult,
    "Unable to inspect participant session link"
  ).public_link_id
  const publicLinkResult = await client
    .from("project_public_links")
    .select("link_token")
    .eq("id", publicLinkId)
    .single<{ link_token: string }>()

  return mapSession(
    expectData(sessionResult, "Unable to update session quality override"),
    expectData(publicLinkResult, "Unable to load public link token").link_token
  )
}

export async function saveProjectSynthesisOverride(
  projectId: string,
  editedNarrative: string,
  consultantNotes: string
) {
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const result = await client
    .from("project_synthesis_overrides")
    .upsert(
      {
        project_id: projectId,
        edited_narrative: editedNarrative,
        consultant_notes: consultantNotes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" }
    )
    .select("*")
    .single<ProjectSynthesisOverrideRow>()

  return mapSynthesisOverride(
    expectData(result, "Unable to save project synthesis override")
  )
}

export async function createProjectConfigVersion(input: {
  projectId: string
  projectName: string
  objective: string
  areasOfInterest: string
  requiredQuestions: string
  durationCapMinutes: number
  anonymityMode: string
  backgroundContext: string
}) {
  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const [projectResult, configResult] = await Promise.all([
    client
      .from("projects")
      .select("*")
      .eq("id", input.projectId)
      .single<ProjectRow>(),
    client
      .from("project_config_versions")
      .select("*")
      .eq("project_id", input.projectId)
      .order("version_number", { ascending: false })
      .limit(1),
  ])

  const project = expectData(
    projectResult,
    "Unable to load project for editing"
  )
  const currentConfigRow = expectRows(
    configResult,
    "Unable to load current project configuration"
  )[0] as ProjectConfigVersionRow | undefined

  if (!currentConfigRow) {
    fail("Project is missing a current configuration version.")
  }

  const currentConfig = mapConfigVersion(currentConfigRow)
  const areasOfInterest = parseLineList(input.areasOfInterest)
  const requiredQuestionPrompts = parseLineList(input.requiredQuestions)
  const nextRequiredQuestions =
    requiredQuestionPrompts.length > 0
      ? requiredQuestionPrompts.map((prompt, index) => ({
          id: `q-v${currentConfig.versionNumber + 1}-${index + 1}`,
          prompt,
          goal: "Consultant supplied question.",
        }))
      : currentConfig.requiredQuestions

  const insertResult = await client
    .from("project_config_versions")
    .insert({
      project_id: input.projectId,
      version_number: currentConfig.versionNumber + 1,
      objective: input.objective.trim() || currentConfig.objective,
      areas_of_interest:
        areasOfInterest.length > 0
          ? areasOfInterest
          : currentConfig.areasOfInterest,
      required_questions: nextRequiredQuestions,
      background_context: input.backgroundContext.trim() || null,
      duration_cap_minutes: Math.min(
        30,
        Math.max(
          5,
          Number.isFinite(input.durationCapMinutes)
            ? Math.round(input.durationCapMinutes)
            : currentConfig.durationCapMinutes
        )
      ),
      interview_mode: currentConfig.interviewMode,
      anonymity_mode: ["named", "pseudonymous", "anonymous"].includes(
        input.anonymityMode
      )
        ? input.anonymityMode
        : currentConfig.anonymityMode,
      tone_style: currentConfig.toneStyle,
      metadata_prompts: currentConfig.metadataPrompts,
      prohibited_topics: currentConfig.prohibitedTopics,
      follow_up_limit: currentConfig.followUpLimit,
    })
    .select("*")
    .single<ProjectConfigVersionRow>()

  const nextConfig = expectData(
    insertResult,
    "Unable to create project configuration version"
  )

  const [projectUpdateResult, linkUpdateResult] = await Promise.all([
    client
      .from("projects")
      .update({
        name: input.projectName.trim() || project.name,
      })
      .eq("id", input.projectId),
    client
      .from("project_public_links")
      .update({
        project_config_version_id: nextConfig.id,
      })
      .eq("project_id", input.projectId)
      .is("revoked_at", null),
  ])

  if (projectUpdateResult.error) {
    fail(
      `Unable to update project metadata: ${projectUpdateResult.error.message}`
    )
  }

  if (linkUpdateResult.error) {
    fail(
      `Unable to repoint project public links: ${linkUpdateResult.error.message}`
    )
  }

  return mapConfigVersion(nextConfig)
}

export async function processQueuedJobs(
  limit = 4,
  workerName = "gather-dispatch"
) {
  const jobs = await claimAnalysisJobs(limit, workerName)
  const processed: AnalysisJob[] = []

  for (const job of jobs) {
    try {
      await processAnalysisJob(job)
      processed.push({ ...job, status: "completed" })
    } catch (error) {
      await failAnalysisJob(
        job,
        error instanceof Error ? error.message : "Analysis job failed."
      )
    }
  }

  return processed
}

export async function recoverAndProcessQueuedJobs(
  limit = 8,
  workerName = "gather-cron"
) {
  await releaseStaleAnalysisJobs()
  return processQueuedJobs(limit, workerName)
}
