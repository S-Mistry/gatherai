export type InterviewMode = "strict" | "adaptive"

export type AnonymityMode = "named" | "pseudonymous" | "anonymous"

export type InterviewState =
  | "pre_start"
  | "consent"
  | "metadata_collection"
  | "intro"
  | "question_active"
  | "follow_up"
  | "question_summary_confirm"
  | "question_advance"
  | "wrap_up"
  | "paused"
  | "complete"
  | "abandoned"

export type SessionStatus =
  | "pre_start"
  | "in_progress"
  | "paused"
  | "complete"
  | "abandoned"

export type TranscriptSpeaker = "participant" | "agent" | "system"

export type AnalysisJobType =
  | "transcript_cleaning"
  | "session_extraction"
  | "quality_scoring"
  | "project_synthesis"

export type AnalysisJobStatus = "queued" | "processing" | "completed" | "failed"

export interface MetadataPrompt {
  id: string
  label: string
  placeholder: string
  required: boolean
}

export interface QuestionDefinition {
  id: string
  prompt: string
  goal: string
}

export interface ProjectConfigVersion {
  id: string
  projectId: string
  versionNumber: number
  createdAt: string
  objective: string
  areasOfInterest: string[]
  requiredQuestions: QuestionDefinition[]
  backgroundContext?: string
  durationCapMinutes: number
  interviewMode: InterviewMode
  anonymityMode: AnonymityMode
  toneStyle: string
  metadataPrompts: MetadataPrompt[]
  prohibitedTopics: string[]
  followUpLimit: number
}

export interface ProjectRecord {
  id: string
  workspaceId: string
  name: string
  slug: string
  clientName: string
  createdAt: string
  updatedAt: string
  status: "draft" | "collecting" | "synthesizing" | "ready"
  currentConfigVersionId: string
  publicLinkToken: string
}

export interface PublicInterviewConfig {
  projectId: string
  projectName: string
  objective: string
  durationCapMinutes: number
  anonymityMode: AnonymityMode
  toneStyle: string
  intro: string
  disclosure: string
  areasOfInterest: string[]
  requiredQuestions: QuestionDefinition[]
  metadataPrompts: MetadataPrompt[]
}

export interface ParticipantSession {
  id: string
  projectId: string
  projectConfigVersionId: string
  publicLinkToken: string
  respondentLabel: string
  status: SessionStatus
  startedAt: string
  lastActivityAt: string
  completedAt?: string
  resumeExpiresAt: string
  metadata: Record<string, string>
  qualityFlag: boolean
  qualityOverride?: SessionQualityOverride
  excludedFromSynthesis: boolean
  runtimeState: SessionRuntimeState
}

export interface SessionRuntimeState {
  state: InterviewState
  activeQuestionId?: string
  askedQuestionIds: string[]
  remainingQuestionIds: string[]
  followUpCount: number
  elapsedSeconds: number
  questionElapsedSeconds: number
  noveltyScore: number
  repetitionScore: number
  coverageConfidence: number
  summaryPending: boolean
  hardStopAt: string
  introDeliveredAt?: string
  readinessDetectedAt?: string
  interviewStartedAt?: string
  pausedAt?: string
}

export interface TranscriptSegment {
  id: string
  sessionId: string
  sourceItemId?: string
  speaker: TranscriptSpeaker
  text: string
  createdAt: string
  orderIndex: number
  startOffsetMs?: number
  endOffsetMs?: number
}

export interface EvidenceRef {
  sessionId: string
  segmentIds: string[]
  rationale: string
}

export type QuestionReviewStatus = "answered" | "partial" | "missing"

export type InsightCardKind =
  | "theme"
  | "pain_point"
  | "opportunity"
  | "risk"
  | "tension"

export type InsightPriority = "high" | "medium" | "low"

export interface QuestionAnswer {
  questionId: string
  prompt: string
  answer: string
  confidence: number
  evidence: EvidenceRef[]
}

export interface QuestionReview {
  questionId: string
  prompt: string
  status: QuestionReviewStatus
  answer: string
  confidence: number
  keyPoints: string[]
  evidence: EvidenceRef[]
  evidenceQuotes: string[]
  followUpQuestions: string[]
}

export interface InsightClaim {
  id: string
  label: string
  summary: string
  evidence: EvidenceRef[]
}

export interface QuoteLibraryItem {
  id: string
  label: string
  excerpt: string
  context: string
  questionIds: string[]
  themeHints: string[]
  evidence: EvidenceRef[]
}

export interface InsightCard {
  id: string
  kind: InsightCardKind
  title: string
  summary: string
  priority: InsightPriority
  evidence: EvidenceRef[]
  evidenceQuotes: string[]
}

export interface ThemeSummary {
  id: string
  title: string
  summary: string
  frequency: number
  evidence: EvidenceRef[]
}

export interface SessionOutputGenerated {
  id: string
  sessionId: string
  cleanedTranscript: string
  summary: string
  questionAnswers: QuestionAnswer[]
  questionReviews: QuestionReview[]
  themes: ThemeSummary[]
  painPoints: InsightClaim[]
  opportunities: InsightClaim[]
  risks: InsightClaim[]
  keyQuotes: InsightClaim[]
  quoteLibrary: QuoteLibraryItem[]
  insightCards: InsightCard[]
  tensions: InsightClaim[]
  unresolvedQuestions: string[]
  workshopImplications: string[]
  recommendedActions: string[]
  analysisWarnings: string[]
  confidenceScore: number
  stakeholderProfile: Record<string, string>
  promptVersionId: string
  modelVersionId: string
  createdAt: string
}

export interface SessionOutputOverride {
  id: string
  sessionId: string
  editedSummary: string
  suppressedClaimIds: string[]
  consultantNotes: string
  updatedAt: string
}

export interface ContradictionItem {
  id: string
  topic: string
  positions: string[]
  evidence: EvidenceRef[]
}

export const PROJECT_EVIDENCE_CLAIM_KINDS = [
  "theme",
  "contradiction",
  "notable_quote",
] as const

export type ProjectEvidenceClaimKind =
  (typeof PROJECT_EVIDENCE_CLAIM_KINDS)[number]

export interface ProjectSynthesisGenerated {
  id: string
  projectId: string
  includedSessionIds: string[]
  executiveSummary: string
  crossInterviewThemes: ThemeSummary[]
  contradictionMap: ContradictionItem[]
  alignmentSignals: string[]
  misalignmentSignals: string[]
  topProblems: string[]
  suggestedWorkshopAgenda: string[]
  notableQuotesByTheme: InsightClaim[]
  warning?: string
  promptVersionId: string
  modelVersionId: string
  createdAt: string
}

export interface ProjectEvidenceSegment {
  id: string
  speaker: TranscriptSpeaker
  text: string
  orderIndex: number
}

export interface ProjectEvidenceExcerpt {
  sessionId: string
  respondentLabel: string
  rationale: string
  segmentIds: string[]
  segments: ProjectEvidenceSegment[]
  reviewHref: string
}

export interface ProjectEvidenceDrawerPayload {
  projectId: string
  claimId: string
  kind: ProjectEvidenceClaimKind
  title: string
  summary: string
  contextLabel?: string
  contextItems: string[]
  totalEvidenceCount: number
  displayedEvidenceCount: number
  excerpts: ProjectEvidenceExcerpt[]
}

export interface ProjectSynthesisOverride {
  id: string
  projectId: string
  editedNarrative: string
  consultantNotes: string
  updatedAt: string
}

export interface SessionQualityOverride {
  lowQuality: boolean
  note: string
  updatedAt: string
}

export interface QualityDimension {
  key:
    | "question_coverage"
    | "answer_specificity"
    | "repetition"
    | "faithfulness"
    | "workshop_usefulness"
  score: number
  rationale: string
}

export interface QualityScore {
  id: string
  sessionId: string
  overall: number
  lowQuality: boolean
  dimensions: QualityDimension[]
  scorerSource: "braintrust" | "application"
  updatedAt: string
}

export interface AnalysisJob {
  id: string
  type: AnalysisJobType
  status: AnalysisJobStatus
  projectId?: string
  sessionId?: string
  payload: Record<string, unknown>
  attempts: number
  maxAttempts: number
  nextAttemptAt: string
  lockedAt?: string
  completedAt?: string
  lastError?: string
  createdAt: string
}

export interface WorkspaceSummary {
  id: string
  name: string
  consultantName: string
}
