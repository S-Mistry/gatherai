import type {
  EvidenceRef,
  ParticipantSession,
  ProjectConfigVersion,
  SessionOutputGenerated,
  TranscriptSegment,
  TranscriptSpeaker,
} from "@/lib/domain/types"

export interface AnalysisTranscriptBlock {
  speaker: TranscriptSpeaker
  segmentIds: string[]
  text: string
  lowSignal: boolean
}

export interface RawSessionEvidenceRef {
  segmentIds: string[]
  rationale: string
}

export interface RawCrossSessionEvidenceRef extends RawSessionEvidenceRef {
  sessionId: string
}

const LOW_SIGNAL_EXACT_MATCHES = new Set([
  "hej",
  "hi",
  "hello",
  "hey",
  "yes",
  "yeah",
  "yep",
  "yup",
  "ok",
  "okay",
  "sure",
  "got it",
  "got you",
  "sounds good",
  "no problem",
  "thank you",
  "thanks",
  "cool",
  "right",
])

const LOW_SIGNAL_PATTERNS = [
  /^can you hear me(?: now)?$/,
  /^can you hear us(?: now)?$/,
  /^can you hear okay$/,
  /^can you hear me okay$/,
  /^can you hear us okay$/,
  /^can you hear that$/,
  /^am i audible$/,
  /^is this working$/,
  /^are you there$/,
  /^hello can you hear me$/,
  /^okay got you$/,
  /^yep got you$/,
  /^yes got you$/,
]

export function normalizeSignalText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function slugifyForId(value: string) {
  const slug = normalizeSignalText(value)
    .replace(/['"]/g, "")
    .replace(/\s+/g, "-")
    .replace(/(^-|-$)/g, "")

  return slug || "item"
}

export function clampScore(value: number, minimum = 0, maximum = 1) {
  if (!Number.isFinite(value)) {
    return minimum
  }

  return Math.min(maximum, Math.max(minimum, value))
}

export function roundScore(value: number, digits = 2) {
  return Number(clampScore(value).toFixed(digits))
}

export function isLowSignalUtterance(text: string) {
  const normalized = normalizeSignalText(text)

  if (!normalized) {
    return true
  }

  if (LOW_SIGNAL_EXACT_MATCHES.has(normalized)) {
    return true
  }

  if (LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true
  }

  const wordCount = normalized.split(" ").filter(Boolean).length

  if (wordCount <= 2 && /^(yes|yeah|yep|ok|okay|sure|thanks?)$/.test(normalized)) {
    return true
  }

  return false
}

function canMergeBlocks(
  current: AnalysisTranscriptBlock | null,
  segment: TranscriptSegment,
  lowSignal: boolean
) {
  if (!current) {
    return false
  }

  if (current.speaker !== segment.speaker || current.lowSignal !== lowSignal) {
    return false
  }

  return `${current.text} ${segment.text}`.trim().length <= 420
}

export function buildAnalysisTranscriptBlocks(
  transcript: TranscriptSegment[]
): AnalysisTranscriptBlock[] {
  const ordered = [...transcript].sort((left, right) => {
    if (left.orderIndex !== right.orderIndex) {
      return left.orderIndex - right.orderIndex
    }

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  })

  const blocks: AnalysisTranscriptBlock[] = []

  for (const segment of ordered) {
    const text = segment.text.trim()

    if (!text) {
      continue
    }

    const lowSignal =
      segment.speaker === "participant" ? isLowSignalUtterance(text) : false
    const current = blocks[blocks.length - 1] ?? null

    if (canMergeBlocks(current, segment, lowSignal)) {
      current.text = `${current.text} ${text}`.trim()
      current.segmentIds.push(segment.id)
      continue
    }

    blocks.push({
      speaker: segment.speaker,
      segmentIds: [segment.id],
      text,
      lowSignal,
    })
  }

  return blocks
}

export function buildCleanedTranscript(blocks: AnalysisTranscriptBlock[]) {
  if (blocks.length === 0) {
    return "No transcript captured."
  }

  return blocks
    .map((block) => `${formatSpeaker(block.speaker)}: ${block.text}`)
    .join("\n")
}

export function renderTranscriptBlocksForPrompt(
  blocks: AnalysisTranscriptBlock[]
) {
  if (blocks.length === 0) {
    return "No transcript blocks were captured for this interview."
  }

  return blocks
    .map(
      (block, index) =>
        `${index + 1}. [${block.segmentIds.join(", ")}] ${formatSpeaker(
          block.speaker
        )} (${block.lowSignal ? "low_signal" : "high_signal"}): ${block.text}`
    )
    .join("\n")
}

export function listParticipantInsightSegmentIds(
  blocks: AnalysisTranscriptBlock[]
) {
  return new Set(
    blocks
      .filter((block) => block.speaker === "participant" && !block.lowSignal)
      .flatMap((block) => block.segmentIds)
  )
}

export function ensureSessionEvidenceRefs(
  sessionId: string,
  evidence: RawSessionEvidenceRef[],
  validSegmentIds: ReadonlySet<string>
): EvidenceRef[] {
  const refs = evidence.flatMap((ref) => {
    const segmentIds = [...new Set(ref.segmentIds)].filter((segmentId) =>
      validSegmentIds.has(segmentId)
    )

    if (segmentIds.length === 0) {
      return []
    }

    return [
      {
        sessionId,
        segmentIds,
        rationale: ref.rationale.trim() || "Transcript evidence cited by analysis.",
      },
    ]
  })

  return dedupeEvidenceRefs(refs)
}

export function ensureCrossSessionEvidenceRefs(
  evidence: RawCrossSessionEvidenceRef[],
  validSegmentIdsBySession: ReadonlyMap<string, ReadonlySet<string>>
): EvidenceRef[] {
  const refs = evidence.flatMap((ref) => {
    const validSegmentIds = validSegmentIdsBySession.get(ref.sessionId)

    if (!validSegmentIds) {
      return []
    }

    return ensureSessionEvidenceRefs(ref.sessionId, [ref], validSegmentIds)
  })

  return dedupeEvidenceRefs(refs)
}

export function dedupeEvidenceRefs(evidence: EvidenceRef[]) {
  const seen = new Set<string>()

  return evidence.filter((ref) => {
    const key = `${ref.sessionId}:${[...new Set(ref.segmentIds)].sort().join(",")}:${ref.rationale}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

export function buildIncludedSessionOutputSet(
  sessions: ParticipantSession[],
  outputs: SessionOutputGenerated[]
) {
  const includedSessionIds = new Set(
    sessions
      .filter(
        (session) => session.status === "complete" && !session.excludedFromSynthesis
      )
      .map((session) => session.id)
  )

  return outputs.filter((output) => includedSessionIds.has(output.sessionId))
}

export function countEvidenceBackedClaims(output: SessionOutputGenerated) {
  const claimBuckets = [
    output.questionAnswers,
    output.themes,
    output.painPoints,
    output.opportunities,
    output.risks,
    output.keyQuotes,
  ]

  const totalClaims = claimBuckets.reduce((count, bucket) => count + bucket.length, 0)
  const claimsWithEvidence = claimBuckets.reduce(
    (count, bucket) => count + bucket.filter((claim) => claim.evidence.length > 0).length,
    0
  )

  return {
    totalClaims,
    claimsWithEvidence,
  }
}

export function formatQuestionList(config: ProjectConfigVersion) {
  return config.requiredQuestions
    .map(
      (question) =>
        `- [${question.id}] ${question.prompt} (${question.goal || "No goal provided."})`
    )
    .join("\n")
}

export function formatSpeaker(speaker: TranscriptSpeaker) {
  if (speaker === "participant") {
    return "Participant"
  }

  if (speaker === "agent") {
    return "Mia"
  }

  return "System"
}
