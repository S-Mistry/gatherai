import crypto from "node:crypto"

import type { User } from "@supabase/supabase-js"

import {
  signRecoveryToken,
  verifyRecoveryToken,
} from "@/lib/auth/recovery-token"
import {
  buildEmptyProjectSynthesis,
  buildGeneratedOutputPlaceholder,
  buildProjectSynthesis,
  buildQualityScore,
  buildSessionOutput,
} from "@/lib/data/placeholders"
import {
  buildInitialRuntimeState,
  DEFAULT_RESUME_WINDOW_HOURS,
} from "@/lib/domain/state-machine"
import type {
  AnalysisJob,
  AnalysisJobStatus,
  AnalysisJobType,
  AnonymityMode,
  MetadataPrompt,
  ParticipantSession,
  ProjectConfigVersion,
  ProjectRecord,
  ProjectSynthesisGenerated,
  QualityDimension,
  QualityScore,
  QuestionDefinition,
  SessionOutputGenerated,
  SessionOutputOverride,
  SessionStatus,
  TranscriptSegment,
  TranscriptSpeaker,
  WorkspaceSummary,
} from "@/lib/domain/types"
import { ANALYSIS_JOB_TYPES } from "@/lib/jobs/analysis"
import {
  createSecretSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server"

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
  name: string
  slug: string
  client_name: string
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
  excluded_from_synthesis: boolean
  runtime_state: unknown
  started_at: string
  last_activity_at: string
  completed_at: string | null
  resume_expires_at: string
}

interface TranscriptSegmentRow {
  id: string
  session_id: string
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

interface QualityScoreRow {
  id: string
  session_id: string
  overall: number | string
  low_quality: boolean
  scorer_source: "braintrust" | "application"
  dimensions: unknown
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
  created_at: string
}

interface ConsultantContext {
  user: User
  profile: ProfileRow | null
  workspace: WorkspaceRow
}

interface NormalizedProjectCreateInput {
  name: string
  slug: string
  clientName: string
  objective: string
  areasOfInterest: string[]
  requiredQuestions: QuestionDefinition[]
  durationCapMinutes: number
  anonymityMode: AnonymityMode
}

interface CreatedProjectGraph {
  projectRow: ProjectRow
  configRow: ProjectConfigVersionRow
  publicLinkToken: string
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
        if (
          typeof item.key !== "string" ||
          typeof item.score !== "number" ||
          typeof item.rationale !== "string"
        ) {
          return []
        }

        return [
          {
            key: item.key as QualityDimension["key"],
            score: item.score,
            rationale: item.rationale,
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
    name: row.name,
    slug: row.slug,
    clientName: row.client_name,
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
    },
  }
}

function mapTranscript(row: TranscriptSegmentRow): TranscriptSegment {
  return {
    id: row.id,
    sessionId: row.session_id,
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
  return {
    id: row.id,
    sessionId: row.session_id,
    cleanedTranscript: row.cleaned_transcript,
    questionAnswers: Array.isArray(payload.questionAnswers)
      ? (payload.questionAnswers as SessionOutputGenerated["questionAnswers"])
      : [],
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
    unresolvedQuestions: safeStringArray(payload.unresolvedQuestions),
    confidenceScore:
      typeof payload.confidenceScore === "number" ? payload.confidenceScore : 0,
    stakeholderProfile: safeStringRecord(payload.stakeholderProfile),
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
    crossInterviewThemes: Array.isArray(payload.crossInterviewThemes)
      ? (payload.crossInterviewThemes as ProjectSynthesisGenerated["crossInterviewThemes"])
      : [],
    contradictionMap: Array.isArray(payload.contradictionMap)
      ? (payload.contradictionMap as ProjectSynthesisGenerated["contradictionMap"])
      : [],
    topProblems: safeStringArray(payload.topProblems),
    suggestedWorkshopAgenda: safeStringArray(payload.suggestedWorkshopAgenda),
    notableQuotesByTheme: Array.isArray(payload.notableQuotesByTheme)
      ? (payload.notableQuotesByTheme as ProjectSynthesisGenerated["notableQuotesByTheme"])
      : [],
    warning: typeof payload.warning === "string" ? payload.warning : undefined,
    promptVersionId: row.prompt_version_id ?? "pending",
    modelVersionId: row.model_version_id ?? "pending",
    createdAt: row.created_at,
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

function normalizeProjectCreateInput(
  input: {
    name: string
    clientName: string
    objective: string
    areasOfInterest: string
    requiredQuestions: string
    durationCapMinutes: number
    anonymityMode: string
  },
  slug: string
): NormalizedProjectCreateInput {
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

  return {
    name: input.name || "Untitled discovery project",
    slug,
    clientName: input.clientName || "Client",
    objective: input.objective || "Capture workshop discovery inputs.",
    areasOfInterest:
      areasOfInterest.length > 0 ? areasOfInterest : ["alignment"],
    requiredQuestions:
      requiredQuestions.length > 0
        ? requiredQuestions
        : [
            {
              id: "q-default-1",
              prompt: "What would make this workshop useful for you?",
              goal: "Fallback success criteria question.",
            },
          ],
    durationCapMinutes: Number.isFinite(input.durationCapMinutes)
      ? input.durationCapMinutes
      : 15,
    anonymityMode: (["named", "pseudonymous", "anonymous"].includes(
      input.anonymityMode
    )
      ? input.anonymityMode
      : "pseudonymous") as AnonymityMode,
  }
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
      project_name: input.name,
      project_slug: input.slug,
      project_client_name: input.clientName,
      project_objective: input.objective,
      project_areas_of_interest: input.areasOfInterest,
      project_required_questions: input.requiredQuestions,
      project_duration_cap_minutes: input.durationCapMinutes,
      project_anonymity_mode: input.anonymityMode,
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
      name: input.name,
      slug: input.slug,
      client_name: input.clientName,
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
      tone_style: "Warm, neutral, researcher-like.",
      metadata_prompts: [],
      prohibited_topics: [],
      follow_up_limit: 2,
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

async function getConsultantContext(): Promise<ConsultantContext | null> {
  const client = await createServerSupabaseClient()

  if (!client) {
    return null
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()

  if (userError) {
    fail(`Unable to read consultant session: ${userError.message}`)
  }

  if (!user) {
    return null
  }

  const [profileResult, workspaceResult] = await Promise.all([
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

async function listProjectSessionIds(
  client: RepositoryClient,
  projectId: string
) {
  const result = await client
    .from("participant_sessions")
    .select("id")
    .eq("project_id", projectId)

  return (
    expectRows(result, "Unable to inspect project sessions") as Array<{
      id: string
    }>
  ).map((row) => row.id)
}

async function getProjectBundleByLinkToken(linkToken: string) {
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

  return {
    client,
    link: expectData(linkResult, "Unable to load project link"),
    project: expectData(projectResult, "Unable to load linked project"),
    config: mapConfigVersion(
      expectData(configResult, "Unable to load linked project configuration")
    ),
  }
}

async function getSessionBundle(sessionId: string) {
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

  const [linkResult, configResult, transcriptResult] = await Promise.all([
    client
      .from("project_public_links")
      .select("*")
      .eq("id", sessionResult.data.public_link_id)
      .single<ProjectPublicLinkRow>(),
    client
      .from("project_config_versions")
      .select("*")
      .eq("id", sessionResult.data.project_config_version_id)
      .single<ProjectConfigVersionRow>(),
    client
      .from("transcript_segments")
      .select("*")
      .eq("session_id", sessionId)
      .order("order_index", { ascending: true }),
  ])

  return {
    client,
    row: sessionResult.data,
    session: mapSession(
      sessionResult.data,
      expectData(linkResult, "Unable to load session public link").link_token
    ),
    config: mapConfigVersion(
      expectData(configResult, "Unable to load session config version")
    ),
    transcript: expectRows(
      transcriptResult,
      "Unable to load session transcript"
    ).map(mapTranscript),
    link: expectData(linkResult, "Unable to load session public link"),
  }
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

async function completeAnalysisJob(jobId: string) {
  const client = requireSecretClient()
  const result = await client
    .from("analysis_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
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
  config: ProjectConfigVersion,
  transcript: TranscriptSegment[]
) {
  const client = requireSecretClient()

  const [projectResult] = await Promise.all([
    client
      .from("projects")
      .select("workspace_id")
      .eq("id", session.projectId)
      .single<{ workspace_id: string }>(),
  ])
  const project = expectData(
    projectResult,
    "Unable to load project for session output persistence"
  )
  const promptVersionId = await ensurePromptVersion(
    client,
    project.workspace_id,
    "session-output",
    "v1",
    "Deterministic placeholder output derived from transcript evidence."
  )
  const modelVersionId = await ensureModelVersion(
    client,
    project.workspace_id,
    "session-output",
    "application",
    "placeholder-v1"
  )
  const output = buildSessionOutput(
    session,
    config,
    transcript,
    promptVersionId,
    modelVersionId
  )

  const result = await client
    .from("session_outputs_generated")
    .upsert(
      {
        session_id: session.id,
        cleaned_transcript: output.cleanedTranscript,
        payload: {
          questionAnswers: output.questionAnswers,
          themes: output.themes,
          painPoints: output.painPoints,
          opportunities: output.opportunities,
          risks: output.risks,
          keyQuotes: output.keyQuotes,
          unresolvedQuestions: output.unresolvedQuestions,
          confidenceScore: output.confidenceScore,
          stakeholderProfile: output.stakeholderProfile,
        },
        prompt_version_id: promptVersionId,
        model_version_id: modelVersionId,
      },
      { onConflict: "session_id" }
    )
    .select("*")
    .single<SessionOutputGeneratedRow>()

  return mapGeneratedOutput(
    expectData(result, "Unable to persist session output")
  )
}

async function persistQualityScore(
  session: ParticipantSession,
  config: ProjectConfigVersion,
  transcript: TranscriptSegment[]
) {
  const client = requireSecretClient()
  const quality = buildQualityScore(session, config, transcript)

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
      .update({ quality_flag: quality.lowQuality })
      .eq("id", session.id),
  ])

  if (sessionResult.error) {
    fail(
      `Unable to update session quality flag: ${sessionResult.error.message}`
    )
  }

  return mapQualityScore(
    expectData(qualityResult, "Unable to persist quality score")
  )
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

  const sessionIds = await listProjectSessionIds(client, projectId)
  const [configRows, linkRows, sessionRows, outputRows] = await Promise.all([
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
    sessionIds.length === 0
      ? Promise.resolve({
          data: [] as SessionOutputGeneratedRow[],
          error: null,
        })
      : client
          .from("session_outputs_generated")
          .select("*")
          .in("session_id", sessionIds),
  ])

  const configRow = expectRows(configRows, "Unable to load project configs")[0]
  const linkRow = expectRows(linkRows, "Unable to load project links")[0]
  const sessions = expectRows(
    sessionRows,
    "Unable to load project sessions"
  ).map((row) =>
    mapSession(row as ParticipantSessionRow, linkRow?.link_token ?? "")
  )
  const outputs = expectRows(
    outputRows,
    "Unable to load generated outputs"
  ).map((row) => mapGeneratedOutput(row as SessionOutputGeneratedRow))
  const promptVersionId = await ensurePromptVersion(
    client,
    workspaceId,
    "project-synthesis",
    "v1",
    "Deterministic placeholder synthesis derived from completed session outputs."
  )
  const modelVersionId = await ensureModelVersion(
    client,
    workspaceId,
    "project-synthesis",
    "application",
    "placeholder-v1"
  )
  const project = mapProject(
    projectRow,
    configRow?.id ?? "",
    linkRow?.link_token ?? ""
  )
  const synthesis = buildProjectSynthesis(
    project,
    sessions,
    outputs,
    promptVersionId,
    modelVersionId
  )

  const result = await client
    .from("project_syntheses_generated")
    .insert({
      project_id: projectId,
      included_session_ids: synthesis.includedSessionIds,
      payload: {
        crossInterviewThemes: synthesis.crossInterviewThemes,
        contradictionMap: synthesis.contradictionMap,
        topProblems: synthesis.topProblems,
        suggestedWorkshopAgenda: synthesis.suggestedWorkshopAgenda,
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

async function processAnalysisJob(job: AnalysisJob) {
  if (!job.sessionId && !job.projectId) {
    fail(`Analysis job ${job.id} is missing both session_id and project_id.`)
  }

  if (job.type === "project_synthesis") {
    await persistProjectSynthesis(job.projectId!)
    await completeAnalysisJob(job.id)
    return
  }

  const bundle = await getSessionBundle(job.sessionId!)

  if (!bundle) {
    fail(`Session ${job.sessionId} was not found for analysis job ${job.id}.`)
  }

  if (job.type === "transcript_cleaning" || job.type === "session_extraction") {
    await persistSessionOutput(bundle.session, bundle.config, bundle.transcript)
  }

  if (job.type === "quality_scoring") {
    await persistQualityScore(bundle.session, bundle.config, bundle.transcript)
  }

  await completeAnalysisJob(job.id)
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
      ? Promise.resolve({ data: [] as ParticipantSessionRow[], error: null })
      : client
          .from("participant_sessions")
          .select("*")
          .in("project_id", projectIds),
  ])
  const sessionRows = expectRows(
    sessionsResult,
    "Unable to load participant sessions"
  ) as ParticipantSessionRow[]
  const incompleteProjectIds = projectRows
    .filter((row) => !configMap.has(row.id) || !linkMap.has(row.id))
    .map((row) => row.id)

  if (incompleteProjectIds.length > 0) {
    fail(
      `Workspace snapshot found projects missing a current configuration or active public link: ${incompleteProjectIds.join(", ")}`
    )
  }

  const projects = projectRows.map((row) => {
    const config = configMap.get(row.id)!
    const link = linkMap.get(row.id)!
    const projectSessions = sessionRows.filter(
      (session) => session.project_id === row.id
    )
    const synthesis = synthesisMap.get(row.id)
    return {
      ...mapProject(row, config.id, link.link_token),
      sessionCounts: {
        inProgress: projectSessions.filter(
          (session) => session.status === "in_progress"
        ).length,
        completed: projectSessions.filter(
          (session) => session.status === "complete"
        ).length,
        abandoned: projectSessions.filter(
          (session) => session.status === "abandoned"
        ).length,
        flagged: projectSessions.filter((session) => session.quality_flag)
          .length,
      },
      activeThemes: synthesis
        ? mapSynthesis(synthesis).crossInterviewThemes
        : [],
      includedSessions: projectSessions.filter(
        (session) =>
          session.status === "complete" && !session.excluded_from_synthesis
      ).length,
    }
  })

  return {
    workspace: buildWorkspaceSummary(
      context.workspace,
      context.profile,
      context.user
    ),
    projects,
  }
}

export async function listProjects() {
  return (await getWorkspaceSnapshot()).projects
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

  const sessionIds = await listProjectSessionIds(client, projectId)
  const [
    configResult,
    linkResult,
    sessionsResult,
    synthesesResult,
    qualityResult,
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
    sessionIds.length === 0
      ? Promise.resolve({ data: [] as QualityScoreRow[], error: null })
      : client.from("quality_scores").select("*").in("session_id", sessionIds),
  ])

  const configRow = expectRows(
    configResult,
    "Unable to load config versions"
  )[0] as ProjectConfigVersionRow | undefined
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
  const sessions = expectRows(
    sessionsResult,
    "Unable to load project sessions"
  ).map((row) => mapSession(row as ParticipantSessionRow, linkRow.link_token))
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

  return {
    project,
    configVersion,
    sessions,
    synthesis: synthesis
      ? mapSynthesis(synthesis)
      : buildEmptyProjectSynthesis(project.id, "pending", "pending"),
    qualityScores,
  }
}

export async function getSessionReview(projectId: string, sessionId: string) {
  const detail = await getProjectDetail(projectId)

  if (!detail) {
    return null
  }

  const session = detail.sessions.find((item) => item.id === sessionId)

  if (!session) {
    return null
  }

  const client = await createServerSupabaseClient()

  if (!client) {
    fail("Supabase publishable-key environment is not configured.")
  }

  const [transcriptResult, generatedResult, overrideResult, qualityResult] =
    await Promise.all([
      client
        .from("transcript_segments")
        .select("*")
        .eq("session_id", sessionId)
        .order("order_index", { ascending: true }),
      client
        .from("session_outputs_generated")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle<SessionOutputGeneratedRow>(),
      client
        .from("session_output_overrides")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle<SessionOutputOverrideRow>(),
      client
        .from("quality_scores")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle<QualityScoreRow>(),
    ])

  if (generatedResult.error) {
    fail(`Unable to load generated output: ${generatedResult.error.message}`)
  }

  if (overrideResult.error) {
    fail(`Unable to load session override: ${overrideResult.error.message}`)
  }

  if (qualityResult.error) {
    fail(`Unable to load session quality score: ${qualityResult.error.message}`)
  }

  return {
    project: detail.project,
    configVersion: detail.configVersion,
    session,
    transcript: expectRows(transcriptResult, "Unable to load transcript").map(
      (row) => mapTranscript(row as TranscriptSegmentRow)
    ),
    generatedOutput: generatedResult.data
      ? mapGeneratedOutput(generatedResult.data)
      : buildGeneratedOutputPlaceholder(session, detail.configVersion),
    override: overrideResult.data
      ? mapOutputOverride(overrideResult.data)
      : undefined,
    qualityScore: qualityResult.data
      ? mapQualityScore(qualityResult.data)
      : undefined,
  }
}

export async function getPublicInterviewConfig(linkToken: string) {
  const bundle = await getProjectBundleByLinkToken(linkToken)

  if (!bundle) {
    return null
  }

  return {
    projectId: bundle.project.id,
    projectName: bundle.project.name,
    objective: bundle.config.objective,
    durationCapMinutes: bundle.config.durationCapMinutes,
    anonymityMode: bundle.config.anonymityMode,
    toneStyle: bundle.config.toneStyle,
    intro:
      "Thanks for taking part. This short interview helps shape a workshop agenda that reflects what stakeholders actually need.",
    disclosure:
      "You are speaking with an AI interviewer. Your conversation is transcribed for workshop discovery. Audio is not stored in this MVP.",
    metadataPrompts: bundle.config.metadataPrompts,
  }
}

export async function createParticipantSession(
  linkToken: string,
  metadata: Record<string, string> = {}
) {
  const bundle = await getProjectBundleByLinkToken(linkToken)

  if (!bundle) {
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
        bundle.config.anonymityMode === "named" ? "Respondent" : "Stakeholder",
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
  }
}

export async function resumeParticipantSession(
  sessionId: string,
  token: string
) {
  const bundle = await getSessionBundle(sessionId)

  if (!bundle) {
    return null
  }

  if (!verifyRecoveryToken(token, sessionId)) {
    return null
  }

  if (new Date(bundle.session.resumeExpiresAt).getTime() < Date.now()) {
    return null
  }

  return bundle.session
}

export async function appendTranscriptSegments(
  sessionId: string,
  segments: Omit<
    TranscriptSegment,
    "id" | "createdAt" | "orderIndex" | "sessionId"
  >[]
) {
  const bundle = await getSessionBundle(sessionId)

  if (!bundle) {
    return null
  }

  const latestSegmentResult = await bundle.client
    .from("transcript_segments")
    .select("order_index")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: false })
    .limit(1)

  const latestSegment = expectRows(
    latestSegmentResult,
    "Unable to inspect transcript ordering"
  )[0] as { order_index: number } | undefined
  const createdAt = new Date().toISOString()
  const insertRows = segments.map((segment, index) => ({
    session_id: sessionId,
    speaker: segment.speaker,
    content: segment.text,
    order_index: (latestSegment?.order_index ?? 0) + index + 1,
    start_offset_ms: segment.startOffsetMs ?? null,
    end_offset_ms: segment.endOffsetMs ?? null,
    created_at: createdAt,
  }))

  const [insertResult, updateResult] = await Promise.all([
    bundle.client.from("transcript_segments").insert(insertRows).select("*"),
    bundle.client
      .from("participant_sessions")
      .update({ last_activity_at: createdAt })
      .eq("id", sessionId),
  ])

  if (updateResult.error) {
    fail(
      `Unable to update participant session activity: ${updateResult.error.message}`
    )
  }

  return expectRows(insertResult, "Unable to append transcript segments").map(
    (row) => mapTranscript(row as TranscriptSegmentRow)
  )
}

export async function completeParticipantSession(sessionId: string) {
  const bundle = await getSessionBundle(sessionId)

  if (!bundle) {
    return null
  }

  if (bundle.session.status === "complete") {
    return {
      session: bundle.session,
      jobs: [],
    }
  }

  const completedAt = new Date().toISOString()
  const updatedRuntimeState = {
    ...bundle.session.runtimeState,
    state: "complete" as const,
  }

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
        ANALYSIS_JOB_TYPES.map((jobType) => ({
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
  }
}

export async function getParticipantSession(sessionId: string) {
  const bundle = await getSessionBundle(sessionId)
  return bundle?.session ?? null
}

export async function createProjectFromForm(input: {
  name: string
  clientName: string
  objective: string
  areasOfInterest: string
  requiredQuestions: string
  durationCapMinutes: number
  anonymityMode: string
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
  const secretClient = createSecretSupabaseClient()

  if (!secretClient) {
    console.warn(
      "Skipping initial placeholder synthesis because the Supabase secret client is unavailable."
    )
  } else {
    try {
      const promptVersionId = await ensurePromptVersion(
        secretClient,
        context.workspace.id,
        "project-synthesis",
        "v1",
        "Deterministic placeholder synthesis derived from completed session outputs."
      )
      const modelVersionId = await ensureModelVersion(
        secretClient,
        context.workspace.id,
        "project-synthesis",
        "application",
        "placeholder-v1"
      )
      const placeholderSynthesis = buildEmptyProjectSynthesis(
        createdProject.projectRow.id,
        promptVersionId,
        modelVersionId
      )
      const synthesisResult = await secretClient
        .from("project_syntheses_generated")
        .insert({
          project_id: createdProject.projectRow.id,
          included_session_ids: [],
          payload: {
            crossInterviewThemes: [],
            contradictionMap: [],
            topProblems: [],
            suggestedWorkshopAgenda: [],
            notableQuotesByTheme: [],
            warning: placeholderSynthesis.warning,
          },
          prompt_version_id: promptVersionId,
          model_version_id: modelVersionId,
        })

      if (synthesisResult.error) {
        console.error(
          `Unable to create initial placeholder synthesis for project ${createdProject.projectRow.id}: ${synthesisResult.error.message}`
        )
      }
    } catch (error) {
      console.error(
        `Unable to initialize placeholder synthesis for project ${createdProject.projectRow.id}.`,
        error
      )
    }
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
