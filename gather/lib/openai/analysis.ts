import { z } from "zod"

import { buildDeterministicQualitySnapshot } from "@/lib/analysis/quality"
import {
  buildAnalysisTranscriptBlocks,
  buildCleanedTranscript,
  buildIncludedSessionOutputSet,
  ensureCrossSessionEvidenceRefs,
  ensureSessionEvidenceRefs,
  formatQuestionList,
  listParticipantInsightSegmentIds,
  renderTranscriptBlocksForPrompt,
  roundScore,
  slugifyForId,
} from "@/lib/analysis/transcript"
import type {
  InsightCard,
  InsightClaim,
  ParticipantSession,
  ProjectConfigVersion,
  ProjectRecord,
  ProjectSynthesisGenerated,
  QualityDimension,
  QuestionReview,
  QuoteLibraryItem,
  SessionOutputGenerated,
  ThemeSummary,
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
  evidence: z.array(rawSessionEvidenceSchema).min(1),
})

const rawGroundedSessionSchema = z.object({
  questionReviews: z.array(rawGroundedQuestionReviewSchema),
  quoteLibrary: z.array(rawGroundedQuoteSchema),
  insightCards: z.array(rawGroundedInsightCardSchema),
  stakeholderProfile: z.record(z.string(), z.string()),
  analysisWarnings: z.array(z.string().min(1)),
})

const rawSessionNarrativeSchema = z.object({
  summary: z.string().min(1),
  workshopImplications: z.array(z.string().min(1)),
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
  suggestedWorkshopAgenda: z.array(z.string().min(1)),
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
    evidence: {
      type: "array",
      items: sessionEvidenceJsonSchema,
      minItems: 1,
    },
  },
  required: ["kind", "title", "summary", "priority", "evidence"],
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
    stakeholderProfile: {
      type: "object",
      additionalProperties: { type: "string" },
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
    "stakeholderProfile",
    "analysisWarnings",
  ],
} satisfies JsonSchema

const sessionNarrativeJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    workshopImplications: { type: "array", items: { type: "string" } },
    recommendedActions: { type: "array", items: { type: "string" } },
    unresolvedQuestions: { type: "array", items: { type: "string" } },
    confidenceScore: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "summary",
    "workshopImplications",
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
    suggestedWorkshopAgenda: { type: "array", items: { type: "string" } },
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
    "suggestedWorkshopAgenda",
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
type RawSessionNarrative = z.infer<typeof rawSessionNarrativeSchema>

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
  | "workshopImplications"
  | "recommendedActions"
  | "analysisWarnings"
  | "confidenceScore"
  | "stakeholderProfile"
>

export type GeneratedProjectAnalysis = Pick<
  ProjectSynthesisGenerated,
  | "executiveSummary"
  | "crossInterviewThemes"
  | "contradictionMap"
  | "alignmentSignals"
  | "misalignmentSignals"
  | "topProblems"
  | "suggestedWorkshopAgenda"
  | "notableQuotesByTheme"
  | "warning"
>

export interface GeneratedQualityAssessment {
  overall: number
  lowQuality: boolean
  dimensions: QualityDimension[]
  scorerSource: "application"
}

export const SESSION_OUTPUT_PROMPT_VERSION_TEXT = [
  "You analyze workshop-discovery interview transcripts and return only grounded, evidence-backed JSON.",
  "Use the full transcript plus the required-question list.",
  "Ignore transcript blocks marked low_signal when extracting insights.",
  "Never promote greetings, acknowledgements, channel checks, filler turns, or consultant context into claims or quotes.",
  "Map answers semantically to the required questions. Never assume transcript order matches question order.",
  "If evidence is weak, keep the question review partial or missing instead of inventing depth.",
  "Every grounded item must cite transcript segment IDs from meaningful participant turns only.",
  "Prefer sharp consultant-usable language over generic summary filler.",
].join(" ")

export const PROJECT_SYNTHESIS_PROMPT_VERSION_TEXT = [
  "You synthesize completed workshop-discovery interviews into a cross-interview view.",
  "Only use the session outputs provided. Do not assume information from excluded or missing sessions.",
  "Do not fabricate contradictions, agenda items, or misalignment if evidence is thin.",
  "Every theme, contradiction, and quote must cite the session IDs and transcript segment IDs already attached to the per-session outputs.",
  "Keep the synthesis sharp, specific, and useful for a consultant preparing a workshop.",
].join(" ")

export const QUALITY_SCORE_PROMPT_VERSION_TEXT = [
  "You score the quality of a workshop-discovery interview analysis.",
  "Use the transcript and generated analysis together.",
  "Faithfulness measures whether the generated output stays strictly supported by the cited transcript evidence.",
  "Workshop usefulness measures whether the captured evidence is specific enough to shape a real workshop agenda.",
  "Do not treat polite greetings or acknowledgements as useful evidence.",
].join(" ")

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

function mapInsightClaims(
  prefix: string,
  sessionId: string,
  claims: Array<{
    label: string
    summary: string
    evidence: Array<{ segmentIds: string[]; rationale: string }>
  }>,
  validSegmentIds: ReadonlySet<string>
): InsightClaim[] {
  return claims.flatMap((claim, index) => {
    const evidence = ensureSessionEvidenceRefs(
      sessionId,
      claim.evidence,
      validSegmentIds
    )

    if (evidence.length === 0) {
      return []
    }

    return [
      {
        id: buildClaimId(
          prefix,
          claim.label,
          evidence[0]?.segmentIds[0] ?? String(index + 1),
          index
        ),
        label: claim.label.trim(),
        summary: claim.summary.trim(),
        evidence,
      },
    ]
  })
}

function mapThemes(
  sessionId: string,
  themes: Array<{
    title: string
    summary: string
    frequency: number
    evidence: Array<{ segmentIds: string[]; rationale: string }>
  }>,
  validSegmentIds: ReadonlySet<string>
): ThemeSummary[] {
  return themes.flatMap((theme, index) => {
    const evidence = ensureSessionEvidenceRefs(
      sessionId,
      theme.evidence,
      validSegmentIds
    )

    if (evidence.length === 0) {
      return []
    }

    return [
      {
        id: buildClaimId(
          "theme",
          theme.title,
          evidence[0]?.segmentIds[0] ?? String(index + 1),
          index
        ),
        title: theme.title.trim(),
        summary: theme.summary.trim(),
        frequency: Math.max(1, theme.frequency),
        evidence,
      },
    ]
  })
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
      return {
        questionId: question.id,
        prompt: question.prompt,
        status: "missing" as const,
        answer: "No grounded answer was extracted for this question.",
        confidence: 0,
        keyPoints: [],
        evidence: [],
        evidenceQuotes: [],
        followUpQuestions: [question.prompt],
      }
    }

    const evidence = ensureSessionEvidenceRefs(
      sessionId,
      review.evidence,
      validSegmentIds
    )

    return {
      questionId: review.questionId,
      prompt: questionPromptById.get(review.questionId) ?? question.prompt,
      status: review.status,
      answer: review.answer.trim(),
      confidence: roundScore(review.confidence),
      keyPoints: dedupeStrings(review.keyPoints),
      evidence,
      evidenceQuotes: collectEvidenceQuotes(evidence, segmentTextById),
      followUpQuestions: dedupeStrings(review.followUpQuestions),
    } satisfies QuestionReview
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
  return grounded.quoteLibrary.flatMap((quote, index) => {
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
}

function buildInsightCards(
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
      } satisfies InsightCard,
    ]
  })
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

  return (
    meaningfulSegmentCount >= 4 &&
    (missingCount >= 2 ||
      partialCount >= Math.max(2, Math.ceil(questionReviews.length / 2)) ||
      insightCards.length < 2 ||
      quoteLibrary.length === 0)
  )
}

async function runGroundingPass({
  model,
  config,
  session,
  promptTranscript,
}: {
  model: string
  config: ProjectConfigVersion
  session: ParticipantSession
  promptTranscript: string
}) {
  return requestStructuredOutput({
    schemaName: "gather_session_grounding_v3",
    schema: groundedSessionJsonSchema,
    validator: rawGroundedSessionSchema,
    model,
    instructions: SESSION_OUTPUT_PROMPT_VERSION_TEXT,
    input: [
      `Project objective:\n${config.objective}`,
      config.backgroundContext
        ? `Background context:\n${config.backgroundContext}`
        : "Background context:\nNone provided.",
      `Required questions:\n${formatQuestionList(config)}`,
      `Transcript blocks:\n${promptTranscript}`,
      `Stakeholder metadata:\n${JSON.stringify(session.metadata, null, 2)}`,
      "Return grounded question reviews, quote candidates, and insight cards only.",
    ].join("\n\n"),
    reasoningEffort: model === openAiModels.sessionEscalation ? "high" : "medium",
  })
}

async function runNarrativePass({
  config,
  grounded,
  questionReviews,
  quoteLibrary,
  insightCards,
}: {
  config: ProjectConfigVersion
  grounded: RawGroundedSession
  questionReviews: QuestionReview[]
  quoteLibrary: QuoteLibraryItem[]
  insightCards: InsightCard[]
}) {
  return requestStructuredOutput({
    schemaName: "gather_session_narrative_v3",
    schema: sessionNarrativeJsonSchema,
    validator: rawSessionNarrativeSchema,
    model: openAiModels.sessionEnrichment,
    instructions: [
      "You write the consultant-facing narrative for a workshop-discovery interview.",
      "Use only the grounded items provided. Do not invent new evidence or claims.",
      "Make the summary sharp and specific.",
      "Workshop implications should explain what this means for workshop design, not restate the transcript.",
      "Recommended actions should be concrete next investigation or facilitation moves.",
    ].join(" "),
    input: [
      `Project objective:\n${config.objective}`,
      `Grounded question reviews:\n${JSON.stringify(questionReviews, null, 2)}`,
      `Quote library:\n${JSON.stringify(quoteLibrary, null, 2)}`,
      `Insight cards:\n${JSON.stringify(insightCards, null, 2)}`,
      `Grounding warnings:\n${JSON.stringify(grounded.analysisWarnings, null, 2)}`,
    ].join("\n\n"),
    reasoningEffort: "medium",
  })
}

export async function generateSessionOutputAnalysis({
  session,
  config,
  transcript,
}: {
  session: ParticipantSession
  config: ProjectConfigVersion
  transcript: TranscriptSegment[]
}): Promise<GeneratedSessionAnalysis> {
  const transcriptBlocks = buildAnalysisTranscriptBlocks(transcript)
  const cleanedTranscript = buildCleanedTranscript(transcriptBlocks)
  const promptTranscript = renderTranscriptBlocksForPrompt(transcriptBlocks)
  const validSegmentIds = listParticipantInsightSegmentIds(transcriptBlocks)
  const segmentTextById = buildSegmentTextLookup(transcript)
  const noMeaningfulEvidence = validSegmentIds.size === 0

  if (noMeaningfulEvidence) {
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
      workshopImplications: [],
      recommendedActions: ["Collect a fuller respondent interview before relying on this output."],
      analysisWarnings: [
        "The transcript does not contain meaningful participant evidence beyond low-signal turns.",
      ],
      confidenceScore: 0.08,
      stakeholderProfile: session.metadata,
    }
  }

  let grounded = await runGroundingPass({
    model: openAiModels.sessionGrounding,
    config,
    session,
    promptTranscript,
  })

  let questionReviews = buildQuestionReviews(
    session.id,
    config,
    grounded,
    validSegmentIds,
    segmentTextById
  )
  let quoteLibrary = buildQuoteLibrary(
    session.id,
    grounded,
    validSegmentIds,
    segmentTextById
  )
  let insightCards = buildInsightCards(
    session.id,
    grounded,
    validSegmentIds,
    segmentTextById
  )

  if (
    openAiModels.sessionEscalation !== openAiModels.sessionGrounding &&
    shouldEscalateGrounding(validSegmentIds.size, questionReviews, insightCards, quoteLibrary)
  ) {
    grounded = await runGroundingPass({
      model: openAiModels.sessionEscalation,
      config,
      session,
      promptTranscript,
    })
    questionReviews = buildQuestionReviews(
      session.id,
      config,
      grounded,
      validSegmentIds,
      segmentTextById
    )
    quoteLibrary = buildQuoteLibrary(
      session.id,
      grounded,
      validSegmentIds,
      segmentTextById
    )
    insightCards = buildInsightCards(
      session.id,
      grounded,
      validSegmentIds,
      segmentTextById
    )
  }

  const narrative = await runNarrativePass({
    config,
    grounded,
    questionReviews,
    quoteLibrary,
    insightCards,
  })

  const questionAnswers = buildQuestionAnswers(questionReviews)
  const themes = deriveThemesFromCards(insightCards)
  const painPoints = deriveInsightClaimsFromCards(
    insightCards,
    "pain_point",
    "pain"
  )
  const opportunities = deriveInsightClaimsFromCards(
    insightCards,
    "opportunity",
    "opportunity"
  )
  const risks = deriveInsightClaimsFromCards(insightCards, "risk", "risk")
  const tensions = deriveInsightClaimsFromCards(
    insightCards,
    "tension",
    "tension"
  )
  const keyQuotes = deriveKeyQuotes(quoteLibrary)
  const missingQuestions = questionReviews
    .filter((review) => review.status !== "answered")
    .map((review) => review.prompt)

  return {
    cleanedTranscript,
    summary:
      narrative.summary.trim() ||
      "The respondent shared limited detail, so only low-confidence insights were extracted.",
    questionAnswers,
    questionReviews,
    themes,
    painPoints,
    opportunities,
    risks,
    keyQuotes,
    quoteLibrary,
    insightCards,
    tensions,
    unresolvedQuestions: dedupeStrings([
      ...narrative.unresolvedQuestions,
      ...missingQuestions,
    ]),
    workshopImplications: dedupeStrings(narrative.workshopImplications).slice(0, 6),
    recommendedActions: dedupeStrings(narrative.recommendedActions).slice(0, 6),
    analysisWarnings: dedupeStrings([
      ...grounded.analysisWarnings,
      ...(quoteLibrary.length === 0
        ? ["No grounded quote library could be extracted from this transcript."]
        : []),
    ]),
    confidenceScore: roundScore(narrative.confidenceScore),
    stakeholderProfile: Object.fromEntries(
      Object.entries(grounded.stakeholderProfile).flatMap(([key, value]) =>
        value.trim().length > 0 ? [[key, value.trim()]] : []
      )
    ),
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
      suggestedWorkshopAgenda: [],
      notableQuotesByTheme: [],
      warning:
        "Synthesis will strengthen after the first completed interviews with usable evidence arrive.",
    }
  }

  const validSegmentIdsBySession = new Map(
    includedOutputs.map((output) => [
      output.sessionId,
      new Set(
        [
          ...output.questionAnswers.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
          ...output.questionReviews.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
          ...output.themes.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
          ...output.painPoints.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
          ...output.opportunities.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
          ...output.risks.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
          ...output.keyQuotes.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
          ...output.quoteLibrary.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
          ...output.insightCards.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
          ...output.tensions.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
        ]
      ),
    ] as const)
  )

  const raw = await requestStructuredOutput({
    schemaName: "gather_project_synthesis_v3",
    schema: projectSynthesisJsonSchema,
    validator: rawProjectSynthesisSchema,
    model: openAiModels.projectSynthesis,
    instructions: PROJECT_SYNTHESIS_PROMPT_VERSION_TEXT,
    input: [
      `Project name: ${project.name}`,
      `Client: ${project.clientName}`,
      `Session count included in synthesis: ${includedOutputs.length}`,
      `Per-session outputs:\n${JSON.stringify(
        includedOutputs.map((output) => ({
          sessionId: output.sessionId,
          summary: output.summary,
          questionReviews: output.questionReviews,
          themes: output.themes,
          painPoints: output.painPoints,
          opportunities: output.opportunities,
          risks: output.risks,
          quoteLibrary: output.quoteLibrary,
          tensions: output.tensions,
          workshopImplications: output.workshopImplications,
          recommendedActions: output.recommendedActions,
          unresolvedQuestions: output.unresolvedQuestions,
          confidenceScore: output.confidenceScore,
          stakeholderProfile: output.stakeholderProfile,
        })),
        null,
        2
      )}`,
    ].join("\n\n"),
    reasoningEffort: "medium",
  })

  const crossInterviewThemes = raw.crossInterviewThemes.flatMap((theme, index) => {
    const evidence = ensureCrossSessionEvidenceRefs(
      theme.evidence,
      validSegmentIdsBySession
    )

    if (evidence.length === 0) {
      return []
    }

    return [
      {
        id: buildClaimId(
          "synthesis-theme",
          theme.title,
          evidence[0]?.segmentIds[0] ?? String(index + 1),
          index
        ),
        title: theme.title.trim(),
        summary: theme.summary.trim(),
        frequency: Math.max(1, theme.frequency),
        evidence,
      },
    ]
  })

  const contradictionMap = raw.contradictionMap.flatMap((item, index) => {
    const evidence = ensureCrossSessionEvidenceRefs(
      item.evidence,
      validSegmentIdsBySession
    )

    if (evidence.length === 0) {
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

    return [
      {
        id: buildClaimId(
          "synthesis-quote",
          quote.label,
          evidence[0]?.segmentIds[0] ?? String(index + 1),
          index
        ),
        label: quote.label.trim(),
        summary: quote.summary.trim(),
        evidence,
      },
    ]
  })

  return {
    includedSessionIds,
    executiveSummary: raw.executiveSummary.trim(),
    crossInterviewThemes,
    contradictionMap,
    alignmentSignals: dedupeStrings(raw.alignmentSignals).slice(0, 6),
    misalignmentSignals: dedupeStrings(raw.misalignmentSignals).slice(0, 6),
    topProblems: dedupeStrings(raw.topProblems).slice(0, 6),
    suggestedWorkshopAgenda: dedupeStrings(raw.suggestedWorkshopAgenda).slice(0, 6),
    notableQuotesByTheme,
    warning: raw.warning.trim() || undefined,
  }
}

export async function evaluateSessionQualityAnalysis({
  session,
  config,
  transcript,
  output,
}: {
  session: ParticipantSession
  config: ProjectConfigVersion
  transcript: TranscriptSegment[]
  output: SessionOutputGenerated
}): Promise<GeneratedQualityAssessment> {
  const deterministic = buildDeterministicQualitySnapshot(config, transcript, output)
  const transcriptBlocks = buildAnalysisTranscriptBlocks(transcript)
  const cleanedTranscript = buildCleanedTranscript(transcriptBlocks)

  const raw = await requestStructuredOutput({
    schemaName: "gather_quality_score_v3",
    schema: qualityAssessmentJsonSchema,
    validator: rawQualityAssessmentSchema,
    model: openAiModels.sessionGrader,
    instructions: QUALITY_SCORE_PROMPT_VERSION_TEXT,
    input: [
      `Session: ${session.id}`,
      `Project objective: ${config.objective}`,
      `Required questions:\n${formatQuestionList(config)}`,
      `Transcript blocks:\n${renderTranscriptBlocksForPrompt(transcriptBlocks)}`,
      `Generated analysis:\n${JSON.stringify(
        {
          summary: output.summary,
          questionReviews: output.questionReviews,
          themes: output.themes,
          insightCards: output.insightCards,
          quoteLibrary: output.quoteLibrary,
          workshopImplications: output.workshopImplications,
          recommendedActions: output.recommendedActions,
          unresolvedQuestions: output.unresolvedQuestions,
          confidenceScore: output.confidenceScore,
        },
        null,
        2
      )}`,
      `Cleaned transcript:\n${cleanedTranscript}`,
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
      key: "workshop_usefulness",
      score: usefulness,
      rationale:
        raw.usefulnessRationale.trim() ||
        "Usefulness reflects how actionable the captured evidence is for workshop design.",
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
