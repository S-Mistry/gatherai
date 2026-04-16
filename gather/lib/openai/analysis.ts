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
  InsightClaim,
  ParticipantSession,
  ProjectConfigVersion,
  ProjectRecord,
  ProjectSynthesisGenerated,
  QualityDimension,
  SessionOutputGenerated,
  ThemeSummary,
  TranscriptSegment,
} from "@/lib/domain/types"
import { env } from "@/lib/env"

type JsonSchema = Record<string, unknown>

const rawSessionEvidenceSchema = z.object({
  segmentIds: z.array(z.string().min(1)).min(1),
  rationale: z.string().min(1),
})

const rawCrossSessionEvidenceSchema = rawSessionEvidenceSchema.extend({
  sessionId: z.string().min(1),
})

const rawQuestionAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1),
  confidence: z.number().min(0).max(1),
  evidence: z.array(rawSessionEvidenceSchema).min(1),
})

const rawInsightClaimSchema = z.object({
  label: z.string().min(1),
  summary: z.string().min(1),
  evidence: z.array(rawSessionEvidenceSchema).min(1),
})

const rawThemeSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  frequency: z.number().int().min(1),
  evidence: z.array(rawSessionEvidenceSchema).min(1),
})

const rawSessionOutputSchema = z.object({
  summary: z.string().min(1),
  questionAnswers: z.array(rawQuestionAnswerSchema),
  themes: z.array(rawThemeSchema),
  painPoints: z.array(rawInsightClaimSchema),
  opportunities: z.array(rawInsightClaimSchema),
  risks: z.array(rawInsightClaimSchema),
  keyQuotes: z.array(rawInsightClaimSchema),
  unresolvedQuestions: z.array(z.string().min(1)),
  confidenceScore: z.number().min(0).max(1),
  stakeholderProfile: z.record(z.string(), z.string()),
})

const rawContradictionSchema = z.object({
  topic: z.string().min(1),
  positions: z.array(z.string().min(1)).min(2),
  evidence: z.array(rawCrossSessionEvidenceSchema).min(1),
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

const rawProjectSynthesisSchema = z.object({
  crossInterviewThemes: z.array(rawProjectThemeSchema),
  contradictionMap: z.array(rawContradictionSchema),
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

const questionAnswerJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questionId: { type: "string" },
    answer: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    evidence: {
      type: "array",
      items: sessionEvidenceJsonSchema,
      minItems: 1,
    },
  },
  required: ["questionId", "answer", "confidence", "evidence"],
} satisfies JsonSchema

const insightClaimJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { type: "string" },
    summary: { type: "string" },
    evidence: {
      type: "array",
      items: sessionEvidenceJsonSchema,
      minItems: 1,
    },
  },
  required: ["label", "summary", "evidence"],
} satisfies JsonSchema

const themeJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    frequency: { type: "integer", minimum: 1 },
    evidence: {
      type: "array",
      items: sessionEvidenceJsonSchema,
      minItems: 1,
    },
  },
  required: ["title", "summary", "frequency", "evidence"],
} satisfies JsonSchema

const sessionOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    questionAnswers: { type: "array", items: questionAnswerJsonSchema },
    themes: { type: "array", items: themeJsonSchema },
    painPoints: { type: "array", items: insightClaimJsonSchema },
    opportunities: { type: "array", items: insightClaimJsonSchema },
    risks: { type: "array", items: insightClaimJsonSchema },
    keyQuotes: { type: "array", items: insightClaimJsonSchema },
    unresolvedQuestions: {
      type: "array",
      items: { type: "string" },
    },
    confidenceScore: { type: "number", minimum: 0, maximum: 1 },
    stakeholderProfile: {
      type: "object",
      additionalProperties: { type: "string" },
    },
  },
  required: [
    "summary",
    "questionAnswers",
    "themes",
    "painPoints",
    "opportunities",
    "risks",
    "keyQuotes",
    "unresolvedQuestions",
    "confidenceScore",
    "stakeholderProfile",
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
    crossInterviewThemes: {
      type: "array",
      items: projectThemeJsonSchema,
    },
    contradictionMap: {
      type: "array",
      items: contradictionJsonSchema,
    },
    topProblems: {
      type: "array",
      items: { type: "string" },
    },
    suggestedWorkshopAgenda: {
      type: "array",
      items: { type: "string" },
    },
    notableQuotesByTheme: {
      type: "array",
      items: projectQuoteJsonSchema,
    },
    warning: { type: "string" },
  },
  required: [
    "crossInterviewThemes",
    "contradictionMap",
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

export type GeneratedSessionAnalysis = Pick<
  SessionOutputGenerated,
  | "cleanedTranscript"
  | "summary"
  | "questionAnswers"
  | "themes"
  | "painPoints"
  | "opportunities"
  | "risks"
  | "keyQuotes"
  | "unresolvedQuestions"
  | "confidenceScore"
  | "stakeholderProfile"
>

export type GeneratedProjectAnalysis = Pick<
  ProjectSynthesisGenerated,
  | "crossInterviewThemes"
  | "contradictionMap"
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
  "Never promote greetings, acknowledgements, channel checks, or filler turns into themes, quotes, or answers.",
  "Map answers semantically to the required questions. Never assume the nth participant turn answers the nth question.",
  "If evidence is weak, omit the claim rather than inventing it.",
  "Every non-summary claim must cite transcript segment IDs from meaningful participant turns only.",
  "Return concise consultant-usable language.",
].join(" ")

export const PROJECT_SYNTHESIS_PROMPT_VERSION_TEXT = [
  "You synthesize completed workshop-discovery interviews into a cross-interview view.",
  "Only use the session outputs provided. Do not assume information from excluded or missing sessions.",
  "Do not fabricate contradictions, agenda items, or risks if evidence is thin.",
  "If there is only early evidence, keep arrays short and use the warning field to note low confidence.",
  "Every theme, contradiction, and quote must cite the session IDs and transcript segment IDs already attached to the per-session outputs.",
].join(" ")

export const QUALITY_SCORE_PROMPT_VERSION_TEXT = [
  "You score the quality of a workshop-discovery interview analysis.",
  "Use the transcript and generated analysis together.",
  "Faithfulness measures whether the generated output stays strictly supported by the cited transcript evidence.",
  "Workshop usefulness measures whether the captured evidence is specific enough to help shape a real workshop agenda.",
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
}: {
  schemaName: string
  schema: JsonSchema
  validator: z.ZodSchema<T>
  model: string
  instructions: string
  input: string
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
      reasoning: { effort: "medium" },
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

function mapInsightClaims(
  prefix: string,
  sessionId: string,
  claims: z.infer<typeof rawInsightClaimSchema>[],
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
  themes: z.infer<typeof rawThemeSchema>[],
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
  const questionPromptById = new Map(
    config.requiredQuestions.map((question) => [question.id, question.prompt] as const)
  )

  const raw = await requestStructuredOutput({
    schemaName: "gather_session_output_v2",
    schema: sessionOutputJsonSchema,
    validator: rawSessionOutputSchema,
    model: env.OPENAI_SESSION_ANALYSIS_MODEL,
    instructions: SESSION_OUTPUT_PROMPT_VERSION_TEXT,
    input: [
      `Project objective:\n${config.objective}`,
      config.backgroundContext
        ? `Background context:\n${config.backgroundContext}`
        : "Background context:\nNone provided.",
      `Required questions:\n${formatQuestionList(config)}`,
      `Transcript blocks:\n${promptTranscript}`,
      `Stakeholder metadata:\n${JSON.stringify(session.metadata, null, 2)}`,
    ].join("\n\n"),
  })

  const questionAnswers = raw.questionAnswers.flatMap((answer) => {
    const prompt = questionPromptById.get(answer.questionId)

    if (!prompt) {
      return []
    }

    const evidence = ensureSessionEvidenceRefs(
      session.id,
      answer.evidence,
      validSegmentIds
    )

    if (evidence.length === 0 || answer.answer.trim().length === 0) {
      return []
    }

    return [
      {
        questionId: answer.questionId,
        prompt,
        answer: answer.answer.trim(),
        confidence: roundScore(answer.confidence),
        evidence,
      },
    ]
  })

  const themes = mapThemes(session.id, raw.themes, validSegmentIds)
  const painPoints = mapInsightClaims(
    "pain",
    session.id,
    raw.painPoints,
    validSegmentIds
  )
  const opportunities = mapInsightClaims(
    "opportunity",
    session.id,
    raw.opportunities,
    validSegmentIds
  )
  const risks = mapInsightClaims("risk", session.id, raw.risks, validSegmentIds)
  const keyQuotes = mapInsightClaims(
    "quote",
    session.id,
    raw.keyQuotes,
    validSegmentIds
  )
  const missingQuestions = config.requiredQuestions
    .filter((question) => !questionAnswers.some((answer) => answer.questionId === question.id))
    .map((question) => question.prompt)
  const unresolvedQuestions = dedupeStrings([
    ...raw.unresolvedQuestions,
    ...missingQuestions,
  ])
  const noMeaningfulEvidence = validSegmentIds.size === 0
  const summary = noMeaningfulEvidence
    ? buildSessionSummaryFallback(transcript)
    : raw.summary.trim() ||
      "The respondent shared limited detail, so only low-confidence insights were extracted."

  return {
    cleanedTranscript,
    summary,
    questionAnswers,
    themes,
    painPoints,
    opportunities,
    risks,
    keyQuotes,
    unresolvedQuestions,
    confidenceScore: noMeaningfulEvidence ? 0.08 : roundScore(raw.confidenceScore),
    stakeholderProfile: Object.fromEntries(
      Object.entries(raw.stakeholderProfile).flatMap(([key, value]) =>
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
      crossInterviewThemes: [],
      contradictionMap: [],
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
          ...output.themes.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
          ...output.painPoints.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
          ...output.opportunities.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
          ...output.risks.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
          ...output.keyQuotes.flatMap((claim) => claim.evidence.flatMap((ref) => ref.segmentIds)),
        ],
      ),
    ] as const)
  )

  const raw = await requestStructuredOutput({
    schemaName: "gather_project_synthesis_v2",
    schema: projectSynthesisJsonSchema,
    validator: rawProjectSynthesisSchema,
    model: env.OPENAI_PROJECT_SYNTHESIS_MODEL,
    instructions: PROJECT_SYNTHESIS_PROMPT_VERSION_TEXT,
    input: [
      `Project name: ${project.name}`,
      `Client: ${project.clientName}`,
      `Session count included in synthesis: ${includedOutputs.length}`,
      `Per-session outputs:\n${JSON.stringify(
        includedOutputs.map((output) => ({
          sessionId: output.sessionId,
          summary: output.summary,
          questionAnswers: output.questionAnswers,
          themes: output.themes,
          painPoints: output.painPoints,
          opportunities: output.opportunities,
          risks: output.risks,
          keyQuotes: output.keyQuotes,
          unresolvedQuestions: output.unresolvedQuestions,
          confidenceScore: output.confidenceScore,
          stakeholderProfile: output.stakeholderProfile,
        })),
        null,
        2
      )}`,
    ].join("\n\n"),
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
    crossInterviewThemes,
    contradictionMap,
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
    schemaName: "gather_quality_score_v2",
    schema: qualityAssessmentJsonSchema,
    validator: rawQualityAssessmentSchema,
    model: env.OPENAI_SESSION_ANALYSIS_MODEL,
    instructions: QUALITY_SCORE_PROMPT_VERSION_TEXT,
    input: [
      `Session: ${session.id}`,
      `Project objective: ${config.objective}`,
      `Required questions:\n${formatQuestionList(config)}`,
      `Transcript blocks:\n${renderTranscriptBlocksForPrompt(transcriptBlocks)}`,
      `Generated analysis:\n${JSON.stringify(
        {
          summary: output.summary,
          questionAnswers: output.questionAnswers,
          themes: output.themes,
          painPoints: output.painPoints,
          opportunities: output.opportunities,
          risks: output.risks,
          keyQuotes: output.keyQuotes,
          unresolvedQuestions: output.unresolvedQuestions,
          confidenceScore: output.confidenceScore,
        },
        null,
        2
      )}`,
      `Cleaned transcript:\n${cleanedTranscript}`,
      `Deterministic signals:\n${JSON.stringify(deterministic, null, 2)}`,
    ].join("\n\n"),
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
