import { z } from "zod"

import { buildDeterministicQualitySnapshot } from "@/lib/analysis/quality"
import {
  type AnalysisTranscriptBlock,
  buildAnalysisTranscriptBlocks,
  buildCleanedTranscript,
  buildIncludedSessionOutputSet,
  canonicalizeThemeLabel,
  countDistinctEvidenceSessions,
  countUniqueEvidenceSegments,
  ensureCrossSessionEvidenceRefs,
  ensureSessionEvidenceRefs,
  formatQuestionList,
  getSingleSegmentEvidenceKey,
  isGenericClaimLabel,
  listParticipantInsightSegmentIds,
  renderTranscriptBlocksForPrompt,
  roundScore,
  slugifyForId,
} from "@/lib/analysis/transcript"
import type {
  EvidenceRef,
  InsightCard,
  ParticipantSession,
  ProjectConfigVersion,
  ProjectRecord,
  ProjectSynthesisGenerated,
  ProjectType,
  QualityDimension,
  QuestionReview,
  QuoteLibraryItem,
  SessionOutputGenerated,
  TranscriptSegment,
} from "@/lib/domain/types"
import { env, openAiModels } from "@/lib/env"

type JsonSchema = Record<string, unknown>

const rawSessionEvidenceSchema = z.object({
  segmentIds: z.array(z.string().min(1)).min(1),
  rationale: z.string().min(1),
})

const rawCrossSessionEvidenceSchema = rawSessionEvidenceSchema.extend({
  sessionId: z.string().min(1),
})

const rawGroundedQuestionReviewSchema = z.object({
  questionId: z.string().min(1),
  status: z.enum(["answered", "partial", "missing"]),
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  keyPoints: z.array(z.string().min(1)),
  evidence: z.array(rawSessionEvidenceSchema),
  followUpQuestions: z.array(z.string().min(1)),
})

const rawGroundedQuoteSchema = z.object({
  label: z.string().min(1),
  context: z.string().min(1),
  questionIds: z.array(z.string().min(1)),
  themeHints: z.array(z.string().min(1)),
  evidence: z.array(rawSessionEvidenceSchema).min(1),
})

const rawGroundedInsightCardSchema = z.object({
  kind: z.enum(["theme", "pain_point", "opportunity", "risk", "tension"]),
  title: z.string().min(1),
  summary: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  signalStrength: z.enum(["obvious", "subtle"]),
  evidence: z.array(rawSessionEvidenceSchema).min(1),
})

const rawGroundedSessionSchema = z.object({
  questionReviews: z.array(rawGroundedQuestionReviewSchema),
  quoteLibrary: z.array(rawGroundedQuoteSchema),
  insightCards: z.array(rawGroundedInsightCardSchema),
  analysisWarnings: z.array(z.string().min(1)),
})

const rawSessionNarrativeSchema = z.object({
  summary: z.string().min(1),
  projectImplications: z.array(z.string().min(1)),
  recommendedActions: z.array(z.string().min(1)),
  unresolvedQuestions: z.array(z.string().min(1)),
  confidenceScore: z.number().min(0).max(1),
})

const rawProjectThemeSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  frequency: z.number().int().min(1),
  evidence: z.array(rawCrossSessionEvidenceSchema).min(1),
})

const rawProjectQuoteSchema = z.object({
  label: z.string().min(1),
  summary: z.string().min(1),
  evidence: z.array(rawCrossSessionEvidenceSchema).min(1),
})

const rawContradictionSchema = z.object({
  topic: z.string().min(1),
  positions: z.array(z.string().min(1)).min(2),
  evidence: z.array(rawCrossSessionEvidenceSchema).min(1),
})

const rawProjectSynthesisSchema = z.object({
  executiveSummary: z.string().min(1),
  crossInterviewThemes: z.array(rawProjectThemeSchema),
  contradictionMap: z.array(rawContradictionSchema),
  alignmentSignals: z.array(z.string().min(1)),
  misalignmentSignals: z.array(z.string().min(1)),
  topProblems: z.array(z.string().min(1)),
  recommendedFocusAreas: z.array(z.string().min(1)),
  notableQuotesByTheme: z.array(rawProjectQuoteSchema),
  warning: z.string(),
})

const rawQualityAssessmentSchema = z.object({
  faithfulnessScore: z.number().min(0).max(1),
  faithfulnessRationale: z.string().min(1),
  usefulnessScore: z.number().min(0).max(1),
  usefulnessRationale: z.string().min(1),
})

const sessionEvidenceJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    segmentIds: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
    rationale: { type: "string" },
  },
  required: ["segmentIds", "rationale"],
} satisfies JsonSchema

const crossSessionEvidenceJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    sessionId: { type: "string" },
    segmentIds: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
    rationale: { type: "string" },
  },
  required: ["sessionId", "segmentIds", "rationale"],
} satisfies JsonSchema

const groundedQuestionReviewJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questionId: { type: "string" },
    status: {
      type: "string",
      enum: ["answered", "partial", "missing"],
    },
    answer: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    keyPoints: { type: "array", items: { type: "string" } },
    evidence: {
      type: "array",
      items: sessionEvidenceJsonSchema,
    },
    followUpQuestions: { type: "array", items: { type: "string" } },
  },
  required: [
    "questionId",
    "status",
    "answer",
    "confidence",
    "keyPoints",
    "evidence",
    "followUpQuestions",
  ],
} satisfies JsonSchema

const groundedQuoteJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { type: "string" },
    context: { type: "string" },
    questionIds: { type: "array", items: { type: "string" } },
    themeHints: { type: "array", items: { type: "string" } },
    evidence: {
      type: "array",
      items: sessionEvidenceJsonSchema,
      minItems: 1,
    },
  },
  required: ["label", "context", "questionIds", "themeHints", "evidence"],
} satisfies JsonSchema

const groundedInsightCardJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: {
      type: "string",
      enum: ["theme", "pain_point", "opportunity", "risk", "tension"],
    },
    title: { type: "string" },
    summary: { type: "string" },
    priority: { type: "string", enum: ["high", "medium", "low"] },
    signalStrength: {
      type: "string",
      enum: ["obvious", "subtle"],
    },
    evidence: {
      type: "array",
      items: sessionEvidenceJsonSchema,
      minItems: 1,
    },
  },
  required: [
    "kind",
    "title",
    "summary",
    "priority",
    "signalStrength",
    "evidence",
  ],
} satisfies JsonSchema

const groundedSessionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questionReviews: {
      type: "array",
      items: groundedQuestionReviewJsonSchema,
    },
    quoteLibrary: {
      type: "array",
      items: groundedQuoteJsonSchema,
    },
    insightCards: {
      type: "array",
      items: groundedInsightCardJsonSchema,
    },
    analysisWarnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "questionReviews",
    "quoteLibrary",
    "insightCards",
    "analysisWarnings",
  ],
} satisfies JsonSchema

const sessionNarrativeJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    projectImplications: { type: "array", items: { type: "string" } },
    recommendedActions: { type: "array", items: { type: "string" } },
    unresolvedQuestions: { type: "array", items: { type: "string" } },
    confidenceScore: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "summary",
    "projectImplications",
    "recommendedActions",
    "unresolvedQuestions",
    "confidenceScore",
  ],
} satisfies JsonSchema

const projectThemeJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    frequency: { type: "integer", minimum: 1 },
    evidence: {
      type: "array",
      items: crossSessionEvidenceJsonSchema,
      minItems: 1,
    },
  },
  required: ["title", "summary", "frequency", "evidence"],
} satisfies JsonSchema

const projectQuoteJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { type: "string" },
    summary: { type: "string" },
    evidence: {
      type: "array",
      items: crossSessionEvidenceJsonSchema,
      minItems: 1,
    },
  },
  required: ["label", "summary", "evidence"],
} satisfies JsonSchema

const contradictionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    topic: { type: "string" },
    positions: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
    },
    evidence: {
      type: "array",
      items: crossSessionEvidenceJsonSchema,
      minItems: 1,
    },
  },
  required: ["topic", "positions", "evidence"],
} satisfies JsonSchema

const projectSynthesisJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    executiveSummary: { type: "string" },
    crossInterviewThemes: { type: "array", items: projectThemeJsonSchema },
    contradictionMap: { type: "array", items: contradictionJsonSchema },
    alignmentSignals: { type: "array", items: { type: "string" } },
    misalignmentSignals: { type: "array", items: { type: "string" } },
    topProblems: { type: "array", items: { type: "string" } },
    recommendedFocusAreas: { type: "array", items: { type: "string" } },
    notableQuotesByTheme: { type: "array", items: projectQuoteJsonSchema },
    warning: { type: "string" },
  },
  required: [
    "executiveSummary",
    "crossInterviewThemes",
    "contradictionMap",
    "alignmentSignals",
    "misalignmentSignals",
    "topProblems",
    "recommendedFocusAreas",
    "notableQuotesByTheme",
    "warning",
  ],
} satisfies JsonSchema

const qualityAssessmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    faithfulnessScore: { type: "number", minimum: 0, maximum: 1 },
    faithfulnessRationale: { type: "string" },
    usefulnessScore: { type: "number", minimum: 0, maximum: 1 },
    usefulnessRationale: { type: "string" },
  },
  required: [
    "faithfulnessScore",
    "faithfulnessRationale",
    "usefulnessScore",
    "usefulnessRationale",
  ],
} satisfies JsonSchema

type RawGroundedSession = z.infer<typeof rawGroundedSessionSchema>
type RawGroundedInsightCard = z.infer<typeof rawGroundedInsightCardSchema>
export type RawSessionNarrative = z.infer<typeof rawSessionNarrativeSchema>
export type RawProjectSynthesis = z.infer<typeof rawProjectSynthesisSchema>

export type GeneratedSessionAnalysis = Pick<
  SessionOutputGenerated,
  | "cleanedTranscript"
  | "summary"
  | "questionAnswers"
  | "questionReviews"
  | "themes"
  | "painPoints"
  | "opportunities"
  | "risks"
  | "keyQuotes"
  | "quoteLibrary"
  | "insightCards"
  | "tensions"
  | "unresolvedQuestions"
  | "projectImplications"
  | "recommendedActions"
  | "analysisWarnings"
  | "confidenceScore"
  | "respondentProfile"
>

export type GeneratedProjectAnalysis = Pick<
  ProjectSynthesisGenerated,
  | "executiveSummary"
  | "crossInterviewThemes"
  | "contradictionMap"
  | "alignmentSignals"
  | "misalignmentSignals"
  | "topProblems"
  | "recommendedFocusAreas"
  | "notableQuotesByTheme"
  | "warning"
>

export interface GeneratedQualityAssessment {
  overall: number
  lowQuality: boolean
  dimensions: QualityDimension[]
  scorerSource: "application"
}

interface MaterializedInsightCandidate extends InsightCard {
  signalStrength: RawGroundedInsightCard["signalStrength"]
}

interface NormalizedProjectThemeCluster {
  canonicalKey: string
  displayTitle: string
  sourceTitles: string[]
  sessionIds: string[]
  evidence: EvidenceRef[]
  summaries: string[]
}

export const SESSION_OUTPUT_PROMPT_VERSION_TEXT = [
  "You analyze transcript-backed structured conversations and return only grounded, evidence-backed JSON.",
  "Use the full transcript plus the required-question list.",
  "Ignore transcript blocks marked low_signal when extracting insights.",
  "Never promote greetings, acknowledgements, channel checks, filler turns, or consultant context into claims or quotes.",
  "Map answers semantically to the required questions. Never assume transcript order matches question order.",
  "Separate obvious observations from subtle latent signals. Mark a claim as subtle only when it is supported by at least two distinct participant transcript segments.",
  "Use tensions for competing incentives, conflicting goals, or tradeoffs surfaced by the respondent.",
  "Use risks for downside exposure or implementation concerns the respondent raised, not generic project risks.",
  "If evidence is weak, keep the question review partial or missing instead of inventing depth.",
  "Do not output generic claim titles such as Theme, Pain point, Risk, Opportunity, or Emerging theme.",
  "Every grounded item must cite transcript segment IDs from meaningful participant turns only.",
  "Prefer sharp consultant-usable language over generic summary filler.",
].join(" ")

export const PROJECT_SYNTHESIS_PROMPT_VERSION_TEXT = [
  "You synthesize completed transcript-backed conversations into a cross-session view.",
  "Only use the session outputs provided. Do not assume information from excluded or missing sessions.",
  "Do not fabricate contradictions, agenda items, or misalignment if evidence is thin.",
  "Treat the normalized theme clusters as the best signal for grouping synonymous session themes.",
  "A contradiction requires materially different positions from at least two distinct included sessions.",
  "Do not turn a single noisy session into a project-level theme when multiple sessions are available.",
  "Every theme, contradiction, and quote must cite the session IDs and transcript segment IDs already attached to the per-session outputs.",
  "Keep the synthesis sharp, specific, and useful for the next planning or improvement decision.",
].join(" ")

export const QUALITY_SCORE_PROMPT_VERSION_TEXT = [
  "You score the quality of a transcript-backed conversation analysis.",
  "Use the transcript and generated analysis together.",
  "Faithfulness measures whether the generated output stays strictly supported by the cited transcript evidence.",
  "Decision usefulness measures whether the captured evidence is specific enough to shape a real planning or improvement decision.",
  "Do not treat polite greetings or acknowledgements as useful evidence.",
].join(" ")

function describeProjectType(projectType: ProjectType) {
  return projectType === "feedback"
    ? {
        context:
          "This conversation happened after a completed workshop, course, or program.",
        narrativeRole:
          "Project implications should explain what this means for improving future rounds, follow-up support, or program changes.",
        synthesisRole:
          "Keep the synthesis useful for an organizer deciding what to improve next time.",
        usefulnessRole:
          "Usefulness reflects how actionable the captured evidence is for improving future rounds of the program.",
      }
    : {
        context:
          "This conversation happened before an upcoming workshop or program.",
        narrativeRole:
          "Project implications should explain what this means for workshop or program design, not restate the transcript.",
        synthesisRole:
          "Keep the synthesis useful for a consultant or facilitator preparing the upcoming session.",
        usefulnessRole:
          "Usefulness reflects how actionable the captured evidence is for shaping the upcoming workshop or program.",
      }
}

function requireOpenAiKey() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is required for analysis generation.")
  }

  return env.OPENAI_API_KEY
}

function safeObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function buildClaimId(prefix: string, label: string, seed: string, index: number) {
  return `${prefix}-${slugifyForId(label)}-${slugifyForId(seed || String(index + 1))}`
}

function buildSessionSummaryFallback(transcript: TranscriptSegment[]) {
  const participantText = transcript
    .filter((segment) => segment.speaker === "participant")
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(" ")

  if (!participantText) {
    return "No participant transcript was captured for this interview."
  }

  return "No reliable participant feedback was captured beyond greeting-level responses."
}

function countInformativeTokens(value: string) {
  return canonicalizeThemeLabel(value).split(" ").filter(Boolean).length
}

function pickSharperText(current: string, candidate: string) {
  const currentText = current.trim()
  const candidateText = candidate.trim()

  if (!currentText) {
    return candidateText
  }

  if (!candidateText) {
    return currentText
  }

  const currentGeneric = isGenericClaimLabel(currentText)
  const candidateGeneric = isGenericClaimLabel(candidateText)

  if (currentGeneric !== candidateGeneric) {
    return candidateGeneric ? currentText : candidateText
  }

  const currentInformative = countInformativeTokens(currentText)
  const candidateInformative = countInformativeTokens(candidateText)

  if (currentInformative !== candidateInformative) {
    return candidateInformative > currentInformative ? candidateText : currentText
  }

  return candidateText.length > currentText.length ? candidateText : currentText
}

function evidenceSignature(
  evidence: Array<{ sessionId?: string; segmentIds: string[] }>
) {
  return evidence
    .map((ref) => ({
      sessionId: ref.sessionId ?? "",
      segmentIds: [...new Set(ref.segmentIds)].sort(),
    }))
    .sort((left, right) => {
      const sessionDelta = left.sessionId.localeCompare(right.sessionId)

      if (sessionDelta !== 0) {
        return sessionDelta
      }

      return left.segmentIds.join(",").localeCompare(right.segmentIds.join(","))
    })
    .map((ref) => `${ref.sessionId}:${ref.segmentIds.join(",")}`)
    .join("|")
}

function insightPriorityRank(priority: InsightCard["priority"]) {
  if (priority === "high") {
    return 3
  }

  if (priority === "medium") {
    return 2
  }

  return 1
}

function insightKindRank(kind: InsightCard["kind"]) {
  if (kind === "theme") {
    return 5
  }

  if (kind === "tension") {
    return 4
  }

  if (kind === "pain_point") {
    return 3
  }

  if (kind === "risk") {
    return 2
  }

  return 1
}

function normalizeQuestionReview(review: QuestionReview): QuestionReview {
  const answer = review.answer.trim()
  const hasEvidence = review.evidence.length > 0
  const hasUsableAnswer =
    answer.length > 0 && !/^no grounded answer/i.test(answer)

  if (hasEvidence) {
    return {
      ...review,
      answer,
      keyPoints: dedupeStrings(review.keyPoints),
      followUpQuestions: dedupeStrings(review.followUpQuestions),
    }
  }

  const downgradedStatus = hasUsableAnswer ? "partial" : "missing"

  return {
    ...review,
    answer: hasUsableAnswer
      ? answer
      : "No grounded answer was extracted for this question.",
    status: downgradedStatus,
    confidence: downgradedStatus === "partial" ? Math.min(review.confidence, 0.35) : 0,
    evidenceQuotes: [],
    followUpQuestions: dedupeStrings(
      review.followUpQuestions.length > 0 ? review.followUpQuestions : [review.prompt]
    ),
  }
}

function mergeThemeCandidates(candidates: MaterializedInsightCandidate[]) {
  const grouped = new Map<string, MaterializedInsightCandidate>()
  const warnings: string[] = []

  for (const candidate of candidates) {
    const canonicalKey = canonicalizeThemeLabel(candidate.title)

    if (!canonicalKey) {
      warnings.push(
        `Dropped theme "${candidate.title}" because it did not contain a stable theme label.`
      )
      continue
    }

    const existing = grouped.get(canonicalKey)

    if (!existing) {
      grouped.set(canonicalKey, candidate)
      continue
    }

    grouped.set(canonicalKey, {
      ...existing,
      title: pickSharperText(existing.title, candidate.title),
      summary: pickSharperText(existing.summary, candidate.summary),
      priority:
        insightPriorityRank(candidate.priority) > insightPriorityRank(existing.priority)
          ? candidate.priority
          : existing.priority,
      evidence: ensureSessionEvidenceRefs(
        existing.evidence[0]?.sessionId ?? candidate.evidence[0]?.sessionId ?? "",
        [
          ...existing.evidence.map((ref) => ({
            segmentIds: ref.segmentIds,
            rationale: ref.rationale,
          })),
          ...candidate.evidence.map((ref) => ({
            segmentIds: ref.segmentIds,
            rationale: ref.rationale,
          })),
        ],
        new Set(
          [
            ...existing.evidence.flatMap((ref) => ref.segmentIds),
            ...candidate.evidence.flatMap((ref) => ref.segmentIds),
          ].filter(Boolean)
        )
      ),
      evidenceQuotes: dedupeStrings([
        ...existing.evidenceQuotes,
        ...candidate.evidenceQuotes,
      ]).slice(0, 3),
      signalStrength:
        existing.signalStrength === "subtle" || candidate.signalStrength === "subtle"
          ? "subtle"
          : "obvious",
    })
  }

  return {
    cards: [...grouped.values()],
    warnings,
  }
}

function limitSingleSegmentInsightReuse(
  candidates: MaterializedInsightCandidate[],
  maxClaimsPerSegment = 2
) {
  const bySegment = new Map<string, MaterializedInsightCandidate[]>()
  const kept: MaterializedInsightCandidate[] = []
  const warnings: string[] = []

  for (const candidate of candidates) {
    const singleSegmentKey = getSingleSegmentEvidenceKey(candidate.evidence)

    if (!singleSegmentKey) {
      kept.push(candidate)
      continue
    }

    const bucket = bySegment.get(singleSegmentKey) ?? []
    bucket.push(candidate)
    bySegment.set(singleSegmentKey, bucket)
  }

  for (const [singleSegmentKey, bucket] of bySegment) {
    const ranked = [...bucket].sort((left, right) => {
      const priorityDelta =
        insightPriorityRank(right.priority) - insightPriorityRank(left.priority)

      if (priorityDelta !== 0) {
        return priorityDelta
      }

      const kindDelta = insightKindRank(right.kind) - insightKindRank(left.kind)

      if (kindDelta !== 0) {
        return kindDelta
      }

      const sharpnessDelta =
        countInformativeTokens(right.title) - countInformativeTokens(left.title)

      if (sharpnessDelta !== 0) {
        return sharpnessDelta
      }

      return right.summary.length - left.summary.length
    })

    kept.push(...ranked.slice(0, maxClaimsPerSegment))

    if (ranked.length > maxClaimsPerSegment) {
      warnings.push(
        `Dropped ${ranked.length - maxClaimsPerSegment} claim(s) that all relied on the same single transcript segment (${singleSegmentKey}).`
      )
    }
  }

  return {
    cards: kept,
    warnings,
  }
}

function limitSingleSegmentQuoteReuse(quotes: QuoteLibraryItem[]) {
  const seen = new Set<string>()
  const kept: QuoteLibraryItem[] = []
  let dropped = 0

  for (const quote of quotes) {
    const singleSegmentKey = getSingleSegmentEvidenceKey(quote.evidence)

    if (!singleSegmentKey) {
      kept.push(quote)
      continue
    }

    if (seen.has(singleSegmentKey)) {
      dropped += 1
      continue
    }

    seen.add(singleSegmentKey)
    kept.push(quote)
  }

  return {
    quotes: kept,
    warnings:
      dropped > 0
        ? [
            `Dropped ${dropped} duplicate quote candidate(s) that reused the same single transcript segment.`,
          ]
        : [],
  }
}

function buildNormalizedProjectThemeClusters(outputs: SessionOutputGenerated[]) {
  const grouped = new Map<string, NormalizedProjectThemeCluster>()

  for (const output of outputs) {
    const sourceThemes =
      output.themes.length > 0
        ? output.themes
        : output.insightCards
            .filter((card) => card.kind === "theme")
            .map((card) => ({
              title: card.title,
              summary: card.summary,
              evidence: card.evidence,
            }))

    for (const theme of sourceThemes) {
      if (isGenericClaimLabel(theme.title)) {
        continue
      }

      const canonicalKey = canonicalizeThemeLabel(theme.title)

      if (!canonicalKey) {
        continue
      }

      const existing = grouped.get(canonicalKey)

      if (!existing) {
        grouped.set(canonicalKey, {
          canonicalKey,
          displayTitle: theme.title.trim(),
          sourceTitles: [theme.title.trim()],
          sessionIds: [output.sessionId],
          evidence: theme.evidence,
          summaries: [theme.summary.trim()],
        })
        continue
      }

      existing.displayTitle = pickSharperText(existing.displayTitle, theme.title)
      existing.sourceTitles = dedupeStrings([...existing.sourceTitles, theme.title.trim()])
      existing.sessionIds = dedupeStrings([...existing.sessionIds, output.sessionId])
      existing.evidence = ensureCrossSessionEvidenceRefs(
        [
          ...existing.evidence.map((ref) => ({
            sessionId: ref.sessionId,
            segmentIds: ref.segmentIds,
            rationale: ref.rationale,
          })),
          ...theme.evidence.map((ref) => ({
            sessionId: ref.sessionId,
            segmentIds: ref.segmentIds,
            rationale: ref.rationale,
          })),
        ],
        new Map(
          dedupeStrings([
            ...existing.evidence.map((ref) => ref.sessionId),
            ...theme.evidence.map((ref) => ref.sessionId),
          ]).map((sessionId) => [
            sessionId,
            new Set(
              [
                ...existing.evidence
                  .filter((ref) => ref.sessionId === sessionId)
                  .flatMap((ref) => ref.segmentIds),
                ...theme.evidence
                  .filter((ref) => ref.sessionId === sessionId)
                  .flatMap((ref) => ref.segmentIds),
              ]
            ),
          ])
        )
      )
      existing.summaries = dedupeStrings([...existing.summaries, theme.summary.trim()])
    }
  }

  return [...grouped.values()].sort((left, right) => {
    const sessionDelta = right.sessionIds.length - left.sessionIds.length

    if (sessionDelta !== 0) {
      return sessionDelta
    }

    return left.displayTitle.localeCompare(right.displayTitle)
  })
}

function buildProjectQuoteLookup(outputs: SessionOutputGenerated[]) {
  const lookup = new Map<string, string>()

  for (const output of outputs) {
    for (const quote of output.quoteLibrary) {
      lookup.set(evidenceSignature(quote.evidence), quote.excerpt)
    }

    for (const quote of output.keyQuotes) {
      lookup.set(evidenceSignature(quote.evidence), quote.summary)
    }
  }

  return lookup
}

function extractResponseText(payload: unknown) {
  const data = safeObject(payload)

  if (typeof data.output_text === "string" && data.output_text.trim().length > 0) {
    return data.output_text.trim()
  }

  const output = Array.isArray(data.output) ? data.output : []

  for (const entry of output) {
    const item = safeObject(entry)
    const content = Array.isArray(item.content) ? item.content : []

    for (const contentEntry of content) {
      const part = safeObject(contentEntry)

      if (part.type === "refusal" && typeof part.refusal === "string") {
        throw new Error(`OpenAI analysis refused the request: ${part.refusal}`)
      }

      if (typeof part.text === "string" && part.text.trim().length > 0) {
        return part.text.trim()
      }

      if (
        typeof part.output_text === "string" &&
        part.output_text.trim().length > 0
      ) {
        return part.output_text.trim()
      }
    }
  }

  return null
}

async function requestStructuredOutput<T>({
  schemaName,
  schema,
  validator,
  model,
  instructions,
  input,
  reasoningEffort = "medium",
}: {
  schemaName: string
  schema: JsonSchema
  validator: z.ZodSchema<T>
  model: string
  instructions: string
  input: string
  reasoningEffort?: "low" | "medium" | "high"
}) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireOpenAiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      reasoning: { effort: reasoningEffort },
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: instructions }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: input }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      `OpenAI structured analysis request failed: ${
        JSON.stringify(payload) || response.statusText
      }`
    )
  }

  const text = extractResponseText(payload)

  if (!text) {
    throw new Error("OpenAI structured analysis response did not include text output.")
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new Error(
      `OpenAI structured analysis response was not valid JSON: ${
        error instanceof Error ? error.message : "Unknown parse failure."
      }`
    )
  }

  return validator.parse(parsed)
}

function buildSegmentTextLookup(transcript: TranscriptSegment[]) {
  return new Map(transcript.map((segment) => [segment.id, segment.text.trim()] as const))
}

function collectEvidenceQuotes(
  evidence: Array<{ segmentIds: string[] }>,
  segmentTextById: ReadonlyMap<string, string>
) {
  return dedupeStrings(
    evidence.flatMap((ref) =>
      ref.segmentIds.flatMap((segmentId) => {
        const text = segmentTextById.get(segmentId)
        return text ? [text] : []
      })
    )
  ).slice(0, 3)
}

function buildQuoteExcerpt(
  evidence: Array<{ segmentIds: string[] }>,
  segmentTextById: ReadonlyMap<string, string>
) {
  const quotes = collectEvidenceQuotes(evidence, segmentTextById)
  return quotes[0] ?? ""
}

function buildEscalationTranscriptBlocks(blocks: AnalysisTranscriptBlock[]) {
  const focusedIndexes = new Set<number>()

  blocks.forEach((block, index) => {
    if (block.speaker !== "participant" || block.lowSignal) {
      return
    }

    focusedIndexes.add(index)

    if (index > 0) {
      focusedIndexes.add(index - 1)
    }

    if (index < blocks.length - 1) {
      focusedIndexes.add(index + 1)
    }
  })

  if (focusedIndexes.size === 0 || focusedIndexes.size === blocks.length) {
    return blocks
  }

  return blocks.filter((_, index) => focusedIndexes.has(index))
}

function buildCompactProjectSynthesisInput(output: SessionOutputGenerated) {
  return {
    sessionId: output.sessionId,
    summary: output.summary,
    analysisWarnings: output.analysisWarnings,
    themes: output.themes.map((theme) => ({
      title: theme.title,
      canonicalTitle: canonicalizeThemeLabel(theme.title),
      summary: theme.summary,
      frequency: theme.frequency,
      evidence: theme.evidence,
    })),
    questionReviews: output.questionReviews.map((review) => ({
      questionId: review.questionId,
      prompt: review.prompt,
      status: review.status,
      answer: review.answer,
      confidence: review.confidence,
      evidence: review.evidence,
    })),
    insightCards: output.insightCards.map((card) => ({
      id: card.id,
      kind: card.kind,
      title: card.title,
      summary: card.summary,
      priority: card.priority,
      evidence: card.evidence,
    })),
    quoteLibrary: output.quoteLibrary.slice(0, 5).map((quote) => ({
      id: quote.id,
      label: quote.label,
      excerpt: quote.excerpt,
      evidence: quote.evidence,
    })),
    projectImplications: output.projectImplications,
    recommendedActions: output.recommendedActions,
    unresolvedQuestions: output.unresolvedQuestions,
    confidenceScore: output.confidenceScore,
    respondentProfile: output.respondentProfile,
  }
}

function buildCompactQualityInput(output: SessionOutputGenerated) {
  return {
    summary: output.summary,
    questionReviews: output.questionReviews.map((review) => ({
      questionId: review.questionId,
      status: review.status,
      answer: review.answer,
      confidence: review.confidence,
      evidence: review.evidence,
    })),
    themes: output.themes.map((theme) => ({
      title: theme.title,
      summary: theme.summary,
      evidence: theme.evidence,
    })),
    insightCards: output.insightCards.map((card) => ({
      kind: card.kind,
      title: card.title,
      summary: card.summary,
      evidence: card.evidence,
    })),
    quoteLibrary: output.quoteLibrary.slice(0, 5).map((quote) => ({
      label: quote.label,
      excerpt: quote.excerpt,
      evidence: quote.evidence,
    })),
    projectImplications: output.projectImplications,
    recommendedActions: output.recommendedActions,
    unresolvedQuestions: output.unresolvedQuestions,
    confidenceScore: output.confidenceScore,
  }
}

function buildQuestionReviews(
  sessionId: string,
  config: ProjectConfigVersion,
  grounded: RawGroundedSession,
  validSegmentIds: ReadonlySet<string>,
  segmentTextById: ReadonlyMap<string, string>
) {
  const questionPromptById = new Map(
    config.requiredQuestions.map((question) => [question.id, question.prompt] as const)
  )
  const groundedById = new Map(
    grounded.questionReviews.map((review) => [review.questionId, review] as const)
  )

  return config.requiredQuestions.map((question) => {
    const review = groundedById.get(question.id)

    if (!review) {
      return normalizeQuestionReview({
        questionId: question.id,
        prompt: question.prompt,
        status: "missing" as const,
        answer: "No grounded answer was extracted for this question.",
        confidence: 0,
        keyPoints: [],
        evidence: [],
        evidenceQuotes: [],
        followUpQuestions: [question.prompt],
      })
    }

    const evidence = ensureSessionEvidenceRefs(
      sessionId,
      review.evidence,
      validSegmentIds
    )

    return normalizeQuestionReview({
      questionId: review.questionId,
      prompt: questionPromptById.get(review.questionId) ?? question.prompt,
      status: review.status,
      answer: review.answer.trim(),
      confidence: roundScore(review.confidence),
      keyPoints: dedupeStrings(review.keyPoints),
      evidence,
      evidenceQuotes: collectEvidenceQuotes(evidence, segmentTextById),
      followUpQuestions: dedupeStrings(review.followUpQuestions),
    } satisfies QuestionReview)
  })
}

function buildQuestionAnswers(questionReviews: QuestionReview[]) {
  return questionReviews.flatMap((review) => {
    if (review.status === "missing" || review.evidence.length === 0) {
      return []
    }

    return [
      {
        questionId: review.questionId,
        prompt: review.prompt,
        answer: review.answer,
        confidence: review.confidence,
        evidence: review.evidence,
      },
    ]
  })
}

function buildQuoteLibrary(
  sessionId: string,
  grounded: RawGroundedSession,
  validSegmentIds: ReadonlySet<string>,
  segmentTextById: ReadonlyMap<string, string>
) {
  const quotes = grounded.quoteLibrary.flatMap((quote, index) => {
    const evidence = ensureSessionEvidenceRefs(
      sessionId,
      quote.evidence,
      validSegmentIds
    )

    if (evidence.length === 0) {
      return []
    }

    const excerpt = buildQuoteExcerpt(evidence, segmentTextById)

    if (!excerpt) {
      return []
    }

    return [
      {
        id: buildClaimId(
          "quote-library",
          quote.label,
          evidence[0]?.segmentIds[0] ?? String(index + 1),
          index
        ),
        label: quote.label.trim(),
        excerpt,
        context: quote.context.trim(),
        questionIds: dedupeStrings(quote.questionIds),
        themeHints: dedupeStrings(quote.themeHints),
        evidence,
      } satisfies QuoteLibraryItem,
    ]
  })

  const deduped = limitSingleSegmentQuoteReuse(quotes)

  return {
    quoteLibrary: deduped.quotes,
    warnings: deduped.warnings,
  }
}

function buildInsightCandidates(
  sessionId: string,
  grounded: RawGroundedSession,
  validSegmentIds: ReadonlySet<string>,
  segmentTextById: ReadonlyMap<string, string>
) {
  return grounded.insightCards.flatMap((card, index) => {
    const evidence = ensureSessionEvidenceRefs(
      sessionId,
      card.evidence,
      validSegmentIds
    )

    if (evidence.length === 0) {
      return []
    }

    return [
      {
        id: buildClaimId(
          card.kind,
          card.title,
          evidence[0]?.segmentIds[0] ?? String(index + 1),
          index
        ),
        kind: card.kind,
        title: card.title.trim(),
        summary: card.summary.trim(),
        priority: card.priority,
        evidence,
        evidenceQuotes: collectEvidenceQuotes(evidence, segmentTextById),
        signalStrength: card.signalStrength,
      } satisfies MaterializedInsightCandidate,
    ]
  })
}

function finalizeInsightCards(candidates: MaterializedInsightCandidate[]) {
  const warnings: string[] = []

  const grounded = candidates.flatMap((candidate) => {
    if (isGenericClaimLabel(candidate.title)) {
      warnings.push(
        `Dropped generic ${candidate.kind.replaceAll("_", " ")} title "${candidate.title}".`
      )
      return []
    }

    if (candidate.evidenceQuotes.length === 0) {
      warnings.push(
        `Dropped "${candidate.title}" because its evidence could not be resolved back to transcript text.`
      )
      return []
    }

    if (
      candidate.signalStrength === "subtle" &&
      countUniqueEvidenceSegments(candidate.evidence) < 2
    ) {
      warnings.push(
        `Dropped subtle claim "${candidate.title}" because it relied on only one transcript segment.`
      )
      return []
    }

    return [candidate]
  })

  const themeResult = mergeThemeCandidates(
    grounded.filter((candidate) => candidate.kind === "theme")
  )
  warnings.push(...themeResult.warnings)

  const reuseResult = limitSingleSegmentInsightReuse([
    ...themeResult.cards,
    ...grounded.filter((candidate) => candidate.kind !== "theme"),
  ])
  warnings.push(...reuseResult.warnings)

  return {
    insightCards: reuseResult.cards.map((candidate) => ({
      id: candidate.id,
      kind: candidate.kind,
      title: candidate.title,
      summary: candidate.summary,
      priority: candidate.priority,
      evidence: candidate.evidence,
      evidenceQuotes: candidate.evidenceQuotes,
    })),
    warnings,
  }
}

function deriveInsightClaimsFromCards(
  cards: InsightCard[],
  kind: InsightCard["kind"],
  prefix: string
) {
  return cards
    .filter((card) => card.kind === kind)
    .map((card, index) => ({
      id: buildClaimId(prefix, card.title, card.id, index),
      label: card.title,
      summary: card.summary,
      evidence: card.evidence,
    }))
}

function deriveThemesFromCards(cards: InsightCard[]) {
  return cards
    .filter((card) => card.kind === "theme")
    .map((card, index) => ({
      id: buildClaimId("theme", card.title, card.id, index),
      title: card.title,
      summary: card.summary,
      frequency: Math.max(1, card.evidence.length),
      evidence: card.evidence,
    }))
}

function deriveKeyQuotes(quoteLibrary: QuoteLibraryItem[]) {
  return quoteLibrary.slice(0, 6).map((quote, index) => ({
    id: buildClaimId("quote", quote.label, quote.id, index),
    label: quote.label,
    summary: quote.excerpt,
    evidence: quote.evidence,
  }))
}

function shouldEscalateGrounding(
  meaningfulSegmentCount: number,
  questionReviews: QuestionReview[],
  insightCards: InsightCard[],
  quoteLibrary: QuoteLibraryItem[]
) {
  const missingCount = questionReviews.filter(
    (review) => review.status === "missing"
  ).length
  const partialCount = questionReviews.filter(
    (review) => review.status === "partial"
  ).length
  const uniqueGroundingSegments = new Set(
    [
      ...insightCards.flatMap((card) => card.evidence.flatMap((ref) => ref.segmentIds)),
      ...quoteLibrary.flatMap((quote) => quote.evidence.flatMap((ref) => ref.segmentIds)),
      ...questionReviews.flatMap((review) => review.evidence.flatMap((ref) => ref.segmentIds)),
    ]
  ).size
  const overConcentratedEvidence =
    insightCards.length + quoteLibrary.length >= 3 && uniqueGroundingSegments <= 2
  const thinQuoteCoverage =
    meaningfulSegmentCount >= 5 && quoteLibrary.length < Math.min(2, insightCards.length)

  return (
    meaningfulSegmentCount >= 4 &&
    (missingCount >= 2 ||
      partialCount >= Math.max(2, Math.ceil(questionReviews.length / 2)) ||
      insightCards.length < 2 ||
      quoteLibrary.length === 0 ||
      thinQuoteCoverage ||
      overConcentratedEvidence)
  )
}

async function runGroundingPass({
  project,
  model,
  config,
  session,
  promptTranscript,
}: {
  project: ProjectRecord
  model: string
  config: ProjectConfigVersion
  session: ParticipantSession
  promptTranscript: string
}) {
  const projectTypeCopy = describeProjectType(project.projectType)

  return requestStructuredOutput({
    schemaName: "gather_session_grounding_v3",
    schema: groundedSessionJsonSchema,
    validator: rawGroundedSessionSchema,
    model,
    instructions: SESSION_OUTPUT_PROMPT_VERSION_TEXT,
    input: [
      `Project type context:\n${projectTypeCopy.context}`,
      `Project objective:\n${config.objective}`,
      config.backgroundContext
        ? `Background context:\n${config.backgroundContext}`
        : "Background context:\nNone provided.",
      `Required questions:\n${formatQuestionList(config)}`,
      `Transcript blocks:\n${promptTranscript}`,
      `Respondent metadata:\n${JSON.stringify(session.metadata, null, 2)}`,
      "Return grounded question reviews, quote candidates, and insight cards only.",
      "Every insight card must set signalStrength to obvious or subtle.",
    ].join("\n\n"),
    reasoningEffort: model === openAiModels.sessionEscalation ? "high" : "medium",
  })
}

async function runNarrativePass({
  project,
  config,
  grounded,
  questionReviews,
  quoteLibrary,
  insightCards,
}: {
  project: ProjectRecord
  config: ProjectConfigVersion
  grounded: RawGroundedSession
  questionReviews: QuestionReview[]
  quoteLibrary: QuoteLibraryItem[]
  insightCards: InsightCard[]
}) {
  const projectTypeCopy = describeProjectType(project.projectType)

  return requestStructuredOutput({
    schemaName: "gather_session_narrative_v3",
    schema: sessionNarrativeJsonSchema,
    validator: rawSessionNarrativeSchema,
    model: openAiModels.sessionEnrichment,
    instructions: [
      "You write the consultant-facing narrative for this transcript-backed conversation.",
      "Use only the grounded items provided. Do not invent new evidence or claims.",
      "Make the summary sharp and specific.",
      projectTypeCopy.narrativeRole,
      "Recommended actions should be concrete next investigation or facilitation moves.",
      "If evidence is thin, acknowledge the uncertainty instead of overstating confidence.",
    ].join(" "),
    input: [
      `Project type context:\n${projectTypeCopy.context}`,
      `Project objective:\n${config.objective}`,
      `Grounded question reviews:\n${JSON.stringify(questionReviews, null, 2)}`,
      `Quote library:\n${JSON.stringify(quoteLibrary, null, 2)}`,
      `Insight cards:\n${JSON.stringify(insightCards, null, 2)}`,
      `Grounding warnings:\n${JSON.stringify(grounded.analysisWarnings, null, 2)}`,
    ].join("\n\n"),
    reasoningEffort: "medium",
  })
}

function buildSessionAnalysisContext(transcript: TranscriptSegment[]) {
  const transcriptBlocks = buildAnalysisTranscriptBlocks(transcript)

  return {
    transcriptBlocks,
    cleanedTranscript: buildCleanedTranscript(transcriptBlocks),
    promptTranscript: renderTranscriptBlocksForPrompt(transcriptBlocks),
    validSegmentIds: listParticipantInsightSegmentIds(transcriptBlocks),
    segmentTextById: buildSegmentTextLookup(transcript),
  }
}

function buildNoMeaningfulEvidenceSessionAnalysis({
  cleanedTranscript,
  config,
  session,
  transcript,
}: {
  cleanedTranscript: string
  config: ProjectConfigVersion
  session: ParticipantSession
  transcript: TranscriptSegment[]
}): GeneratedSessionAnalysis {
  const missingQuestions = config.requiredQuestions.map((question) => question.prompt)

  return {
    cleanedTranscript,
    summary: buildSessionSummaryFallback(transcript),
    questionAnswers: [],
    questionReviews: config.requiredQuestions.map((question) => ({
      questionId: question.id,
      prompt: question.prompt,
      status: "missing",
      answer: "No grounded answer was extracted for this question.",
      confidence: 0,
      keyPoints: [],
      evidence: [],
      evidenceQuotes: [],
      followUpQuestions: [question.prompt],
    })),
    themes: [],
    painPoints: [],
    opportunities: [],
    risks: [],
    keyQuotes: [],
    quoteLibrary: [],
    insightCards: [],
    tensions: [],
    unresolvedQuestions: missingQuestions,
    projectImplications: [],
    recommendedActions: ["Collect a fuller respondent interview before relying on this output."],
    analysisWarnings: [
      "The transcript does not contain meaningful participant evidence beyond low-signal turns.",
    ],
    confidenceScore: 0.08,
    respondentProfile: session.metadata,
  }
}

function normalizeRespondentProfile(metadata: ParticipantSession["metadata"]) {
  return Object.fromEntries(
    Object.entries(metadata).flatMap(([key, value]) => {
      const label = key.trim()
      const text = value.trim()

      return label && text ? [[label, text]] : []
    })
  )
}

function buildGroundedSessionArtifacts({
  sessionId,
  config,
  grounded,
  validSegmentIds,
  segmentTextById,
}: {
  sessionId: string
  config: ProjectConfigVersion
  grounded: RawGroundedSession
  validSegmentIds: ReadonlySet<string>
  segmentTextById: ReadonlyMap<string, string>
}) {
  const questionReviews = buildQuestionReviews(
    sessionId,
    config,
    grounded,
    validSegmentIds,
    segmentTextById
  )
  const quoteResult = buildQuoteLibrary(
    sessionId,
    grounded,
    validSegmentIds,
    segmentTextById
  )
  const insightResult = finalizeInsightCards(
    buildInsightCandidates(
      sessionId,
      grounded,
      validSegmentIds,
      segmentTextById
    )
  )

  return {
    questionReviews,
    quoteLibrary: quoteResult.quoteLibrary,
    insightCards: insightResult.insightCards,
    warnings: [...quoteResult.warnings, ...insightResult.warnings],
  }
}

export function materializeSessionOutputAnalysis({
  session,
  config,
  transcript,
  grounded,
  narrative,
}: {
  session: ParticipantSession
  config: ProjectConfigVersion
  transcript: TranscriptSegment[]
  grounded: RawGroundedSession
  narrative: RawSessionNarrative
}): GeneratedSessionAnalysis {
  const context = buildSessionAnalysisContext(transcript)

  if (context.validSegmentIds.size === 0) {
    return buildNoMeaningfulEvidenceSessionAnalysis({
      cleanedTranscript: context.cleanedTranscript,
      config,
      session,
      transcript,
    })
  }

  const artifacts = buildGroundedSessionArtifacts({
    sessionId: session.id,
    config,
    grounded,
    validSegmentIds: context.validSegmentIds,
    segmentTextById: context.segmentTextById,
  })
  const questionAnswers = buildQuestionAnswers(artifacts.questionReviews)
  const themes = deriveThemesFromCards(artifacts.insightCards)
  const painPoints = deriveInsightClaimsFromCards(
    artifacts.insightCards,
    "pain_point",
    "pain"
  )
  const opportunities = deriveInsightClaimsFromCards(
    artifacts.insightCards,
    "opportunity",
    "opportunity"
  )
  const risks = deriveInsightClaimsFromCards(artifacts.insightCards, "risk", "risk")
  const tensions = deriveInsightClaimsFromCards(
    artifacts.insightCards,
    "tension",
    "tension"
  )
  const keyQuotes = deriveKeyQuotes(artifacts.quoteLibrary)
  const missingQuestions = artifacts.questionReviews
    .filter((review) => review.status !== "answered")
    .map((review) => review.prompt)
  const thinEvidence =
    context.validSegmentIds.size < Math.max(2, Math.min(4, config.requiredQuestions.length))
  const lowCoverage =
    artifacts.questionReviews.filter((review) => review.status === "answered").length <
    Math.max(1, Math.ceil(config.requiredQuestions.length / 2))

  return {
    cleanedTranscript: context.cleanedTranscript,
    summary:
      narrative.summary.trim() ||
      "The respondent shared limited detail, so only low-confidence insights were extracted.",
    questionAnswers,
    questionReviews: artifacts.questionReviews,
    themes,
    painPoints,
    opportunities,
    risks,
    keyQuotes,
    quoteLibrary: artifacts.quoteLibrary,
    insightCards: artifacts.insightCards,
    tensions,
    unresolvedQuestions: dedupeStrings([
      ...narrative.unresolvedQuestions,
      ...missingQuestions,
    ]),
    projectImplications: dedupeStrings(narrative.projectImplications).slice(0, 6),
    recommendedActions: dedupeStrings(narrative.recommendedActions).slice(0, 6),
    analysisWarnings: dedupeStrings([
      ...grounded.analysisWarnings,
      ...artifacts.warnings,
      ...(artifacts.quoteLibrary.length === 0
        ? ["No grounded quote library could be extracted from this transcript."]
        : []),
      ...(thinEvidence
        ? [
            "Most grounded claims rely on thin transcript evidence, so treat this analysis as directional rather than complete.",
          ]
        : []),
      ...(lowCoverage
        ? [
            "Several required questions remain only partially answered, so unresolved gaps should shape follow-up interviews or next-step decisions.",
          ]
        : []),
    ]),
    confidenceScore: roundScore(
      thinEvidence ? narrative.confidenceScore * 0.82 : narrative.confidenceScore
    ),
    respondentProfile: normalizeRespondentProfile(session.metadata),
  }
}

export async function generateSessionOutputAnalysis({
  project,
  session,
  config,
  transcript,
}: {
  project: ProjectRecord
  session: ParticipantSession
  config: ProjectConfigVersion
  transcript: TranscriptSegment[]
}): Promise<GeneratedSessionAnalysis> {
  const context = buildSessionAnalysisContext(transcript)

  if (context.validSegmentIds.size === 0) {
    return buildNoMeaningfulEvidenceSessionAnalysis({
      cleanedTranscript: context.cleanedTranscript,
      config,
      session,
      transcript,
    })
  }

  let grounded = await runGroundingPass({
    project,
    model: openAiModels.sessionGrounding,
    config,
    session,
    promptTranscript: context.promptTranscript,
  })

  let artifacts = buildGroundedSessionArtifacts({
    sessionId: session.id,
    config,
    grounded,
    validSegmentIds: context.validSegmentIds,
    segmentTextById: context.segmentTextById,
  })

  if (
    openAiModels.sessionEscalation !== openAiModels.sessionGrounding &&
    shouldEscalateGrounding(
      context.validSegmentIds.size,
      artifacts.questionReviews,
      artifacts.insightCards,
      artifacts.quoteLibrary
    )
  ) {
    const escalationTranscript = renderTranscriptBlocksForPrompt(
      buildEscalationTranscriptBlocks(context.transcriptBlocks)
    )

    grounded = await runGroundingPass({
      project,
      model: openAiModels.sessionEscalation,
      config,
      session,
      promptTranscript: escalationTranscript,
    })
    artifacts = buildGroundedSessionArtifacts({
      sessionId: session.id,
      config,
      grounded,
      validSegmentIds: context.validSegmentIds,
      segmentTextById: context.segmentTextById,
    })
  }

  const narrative = await runNarrativePass({
    project,
    config,
    grounded,
    questionReviews: artifacts.questionReviews,
    quoteLibrary: artifacts.quoteLibrary,
    insightCards: artifacts.insightCards,
  })

  return materializeSessionOutputAnalysis({
    session,
    config,
    transcript,
    grounded,
    narrative,
  })
}

function buildValidSegmentIdsBySession(outputs: SessionOutputGenerated[]) {
  return new Map(
    outputs.map((output) => [
      output.sessionId,
      new Set(
        [
          ...output.questionAnswers.flatMap((claim) =>
            claim.evidence.flatMap((ref) => ref.segmentIds)
          ),
          ...output.questionReviews.flatMap((claim) =>
            claim.evidence.flatMap((ref) => ref.segmentIds)
          ),
          ...output.themes.flatMap((claim) =>
            claim.evidence.flatMap((ref) => ref.segmentIds)
          ),
          ...output.painPoints.flatMap((claim) =>
            claim.evidence.flatMap((ref) => ref.segmentIds)
          ),
          ...output.opportunities.flatMap((claim) =>
            claim.evidence.flatMap((ref) => ref.segmentIds)
          ),
          ...output.risks.flatMap((claim) =>
            claim.evidence.flatMap((ref) => ref.segmentIds)
          ),
          ...output.keyQuotes.flatMap((claim) =>
            claim.evidence.flatMap((ref) => ref.segmentIds)
          ),
          ...output.quoteLibrary.flatMap((claim) =>
            claim.evidence.flatMap((ref) => ref.segmentIds)
          ),
          ...output.insightCards.flatMap((claim) =>
            claim.evidence.flatMap((ref) => ref.segmentIds)
          ),
          ...output.tensions.flatMap((claim) =>
            claim.evidence.flatMap((ref) => ref.segmentIds)
          ),
        ]
      ),
    ] as const)
  )
}

export function materializeProjectSynthesisAnalysis({
  sessions,
  outputs,
  raw,
}: {
  sessions: ParticipantSession[]
  outputs: SessionOutputGenerated[]
  raw: RawProjectSynthesis
}): GeneratedProjectAnalysis & { includedSessionIds: string[] } {
  const includedOutputs = buildIncludedSessionOutputSet(sessions, outputs)
  const includedSessionIds = includedOutputs.map((output) => output.sessionId)

  if (includedOutputs.length === 0) {
    return {
      includedSessionIds: [],
      executiveSummary: "",
      crossInterviewThemes: [],
      contradictionMap: [],
      alignmentSignals: [],
      misalignmentSignals: [],
      topProblems: [],
      recommendedFocusAreas: [],
      notableQuotesByTheme: [],
      warning:
        "Synthesis will strengthen after the first completed interviews with usable evidence arrive.",
    }
  }

  const validSegmentIdsBySession = buildValidSegmentIdsBySession(includedOutputs)
  const minimumThemeSessionSupport = includedOutputs.length >= 2 ? 2 : 1
  const normalizedThemeClusters = buildNormalizedProjectThemeClusters(includedOutputs)
  const quoteLookup = buildProjectQuoteLookup(includedOutputs)

  const themeGroups = new Map<string, GeneratedProjectAnalysis["crossInterviewThemes"][number]>()

  raw.crossInterviewThemes.forEach((theme, index) => {
    const evidence = ensureCrossSessionEvidenceRefs(
      theme.evidence,
      validSegmentIdsBySession
    )

    if (evidence.length === 0 || isGenericClaimLabel(theme.title)) {
      return
    }

    const canonicalKey = canonicalizeThemeLabel(theme.title)

    if (!canonicalKey) {
      return
    }

    const existing = themeGroups.get(canonicalKey)

    if (!existing) {
      themeGroups.set(canonicalKey, {
        id: buildClaimId(
          "synthesis-theme",
          theme.title,
          evidence[0]?.segmentIds[0] ?? String(index + 1),
          index
        ),
        title: theme.title.trim(),
        summary: theme.summary.trim(),
        frequency: countDistinctEvidenceSessions(evidence),
        evidence,
      })
      return
    }

    existing.title = pickSharperText(existing.title, theme.title)
    existing.summary = pickSharperText(existing.summary, theme.summary)
    existing.evidence = ensureCrossSessionEvidenceRefs(
      [
        ...existing.evidence.map((ref) => ({
          sessionId: ref.sessionId,
          segmentIds: ref.segmentIds,
          rationale: ref.rationale,
        })),
        ...theme.evidence,
      ],
      validSegmentIdsBySession
    )
    existing.frequency = countDistinctEvidenceSessions(existing.evidence)
  })

  const crossInterviewThemes = [...themeGroups.values()]
    .map((theme) => ({
      ...theme,
      frequency: countDistinctEvidenceSessions(theme.evidence),
    }))
    .filter((theme) => theme.frequency >= minimumThemeSessionSupport)
    .sort((left, right) => {
      const frequencyDelta = right.frequency - left.frequency

      if (frequencyDelta !== 0) {
        return frequencyDelta
      }

      return left.title.localeCompare(right.title)
    })

  const contradictionMap = raw.contradictionMap.flatMap((item, index) => {
    const evidence = ensureCrossSessionEvidenceRefs(
      item.evidence,
      validSegmentIdsBySession
    )

    if (
      evidence.length === 0 ||
      countDistinctEvidenceSessions(evidence) < 2 ||
      dedupeStrings(item.positions).length < 2
    ) {
      return []
    }

    return [
      {
        id: buildClaimId(
          "contradiction",
          item.topic,
          evidence[0]?.segmentIds[0] ?? String(index + 1),
          index
        ),
        topic: item.topic.trim(),
        positions: dedupeStrings(item.positions),
        evidence,
      },
    ]
  })

  const notableQuotesByTheme = raw.notableQuotesByTheme.flatMap((quote, index) => {
    const evidence = ensureCrossSessionEvidenceRefs(
      quote.evidence,
      validSegmentIdsBySession
    )

    if (evidence.length === 0) {
      return []
    }

    const canonicalSummary =
      quoteLookup.get(evidenceSignature(evidence)) ?? quote.summary.trim()

    return [
      {
        id: buildClaimId(
          "synthesis-quote",
          quote.label,
          evidence[0]?.segmentIds[0] ?? String(index + 1),
          index
        ),
        label: quote.label.trim(),
        summary: canonicalSummary,
        evidence,
      },
    ]
  })

  const weakThemeWarning =
    normalizedThemeClusters.length > 0 && crossInterviewThemes.length === 0
      ? "Potential themes were detected in session analysis, but none met the project-level evidence threshold yet."
      : ""
  const earlySignalWarning =
    includedOutputs.length < 2
      ? "Project synthesis is still early because only one completed interview is included."
      : ""

  return {
    includedSessionIds,
    executiveSummary: raw.executiveSummary.trim(),
    crossInterviewThemes,
    contradictionMap,
    alignmentSignals: dedupeStrings(raw.alignmentSignals).slice(0, 6),
    misalignmentSignals: dedupeStrings(raw.misalignmentSignals).slice(0, 6),
    topProblems: dedupeStrings(raw.topProblems).slice(0, 6),
    recommendedFocusAreas: dedupeStrings(raw.recommendedFocusAreas).slice(0, 6),
    notableQuotesByTheme,
    warning:
      dedupeStrings([raw.warning.trim(), weakThemeWarning, earlySignalWarning]).join(" ") ||
      undefined,
  }
}

export async function generateProjectSynthesisAnalysis({
  project,
  sessions,
  outputs,
}: {
  project: ProjectRecord
  sessions: ParticipantSession[]
  outputs: SessionOutputGenerated[]
}): Promise<GeneratedProjectAnalysis & { includedSessionIds: string[] }> {
  const includedOutputs = buildIncludedSessionOutputSet(sessions, outputs)

  if (includedOutputs.length === 0) {
    return {
      includedSessionIds: [],
      executiveSummary: "",
      crossInterviewThemes: [],
      contradictionMap: [],
      alignmentSignals: [],
      misalignmentSignals: [],
      topProblems: [],
      recommendedFocusAreas: [],
      notableQuotesByTheme: [],
      warning:
        "Synthesis will strengthen after the first completed interviews with usable evidence arrive.",
    }
  }

  const normalizedThemeClusters = buildNormalizedProjectThemeClusters(includedOutputs)
  const projectTypeCopy = describeProjectType(project.projectType)

  const raw = await requestStructuredOutput({
    schemaName: "gather_project_synthesis_v3",
    schema: projectSynthesisJsonSchema,
    validator: rawProjectSynthesisSchema,
    model: openAiModels.projectSynthesis,
    instructions: [PROJECT_SYNTHESIS_PROMPT_VERSION_TEXT, projectTypeCopy.synthesisRole].join(" "),
    input: [
      `Project name: ${project.name}`,
      `Client: ${project.clientName}`,
      `Project type context: ${projectTypeCopy.context}`,
      `Session count included in synthesis: ${includedOutputs.length}`,
      `Per-session outputs:\n${JSON.stringify(
        includedOutputs.map((output) => buildCompactProjectSynthesisInput(output)),
        null,
        2
      )}`,
      `Normalized theme clusters:\n${JSON.stringify(normalizedThemeClusters, null, 2)}`,
    ].join("\n\n"),
    reasoningEffort: "medium",
  })

  return materializeProjectSynthesisAnalysis({
    sessions,
    outputs,
    raw,
  })
}

export async function evaluateSessionQualityAnalysis({
  project,
  session,
  config,
  transcript,
  output,
}: {
  project: ProjectRecord
  session: ParticipantSession
  config: ProjectConfigVersion
  transcript: TranscriptSegment[]
  output: SessionOutputGenerated
}): Promise<GeneratedQualityAssessment> {
  const deterministic = buildDeterministicQualitySnapshot(config, transcript, output)
  const cleanedTranscript = buildCleanedTranscript(
    buildAnalysisTranscriptBlocks(transcript)
  )

  const raw = await requestStructuredOutput({
    schemaName: "gather_quality_score_v3",
    schema: qualityAssessmentJsonSchema,
    validator: rawQualityAssessmentSchema,
    model: openAiModels.sessionGrader,
    instructions: [
      QUALITY_SCORE_PROMPT_VERSION_TEXT,
      describeProjectType(project.projectType).usefulnessRole,
    ].join(" "),
    input: [
      `Session: ${session.id}`,
      `Project type context: ${describeProjectType(project.projectType).context}`,
      `Project objective: ${config.objective}`,
      `Required questions:\n${formatQuestionList(config)}`,
      `Cleaned transcript:\n${cleanedTranscript}`,
      `Generated analysis:\n${JSON.stringify(
        buildCompactQualityInput(output),
        null,
        2
      )}`,
      `Deterministic signals:\n${JSON.stringify(deterministic, null, 2)}`,
    ].join("\n\n"),
    reasoningEffort: "low",
  })

  const faithfulness = roundScore(
    raw.faithfulnessScore * 0.75 + deterministic.evidenceCompleteness * 0.25
  )
  const usefulness = roundScore(
    raw.usefulnessScore * 0.6 +
      deterministic.coverage * 0.2 +
      deterministic.transcriptSufficiency * 0.2
  )
  const dimensions: QualityDimension[] = [
    {
      key: "question_coverage",
      score: deterministic.coverage,
      rationale:
        deterministic.coverage >= 0.8
          ? "Most required questions have evidence-backed answers."
          : "Several required questions still lack evidence-backed answers.",
    },
    {
      key: "answer_specificity",
      score: deterministic.specificity,
      rationale:
        deterministic.meaningfulCharacterCount >= 450
          ? "The respondent provided concrete detail beyond greeting-level replies."
          : "The respondent provided limited concrete detail, so answers remain shallow.",
    },
    {
      key: "repetition",
      score: deterministic.repetition,
      rationale:
        deterministic.repetition >= 0.7
          ? "Responses covered multiple distinct points without heavy repetition."
          : "Responses repeated similar ideas, reducing novelty and depth.",
    },
    {
      key: "faithfulness",
      score: faithfulness,
      rationale:
        raw.faithfulnessRationale.trim() ||
        "Faithfulness was scored against the transcript and evidence completeness.",
    },
    {
      key: "decision_usefulness",
      score: usefulness,
      rationale:
        raw.usefulnessRationale.trim() ||
        describeProjectType(project.projectType).usefulnessRole,
    },
  ]
  const overall = roundScore(
    deterministic.coverage * 0.24 +
      deterministic.specificity * 0.18 +
      deterministic.repetition * 0.14 +
      faithfulness * 0.24 +
      usefulness * 0.2
  )
  const lowQuality =
    overall < 0.55 ||
    faithfulness < 0.45 ||
    deterministic.transcriptSufficiency < 0.22

  return {
    overall,
    lowQuality,
    dimensions,
    scorerSource: "application",
  }
}
