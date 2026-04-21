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
  "hello hello",
  "good morning",
  "good afternoon",
  "good evening",
  "yes",
  "yeah",
  "yep",
  "yup",
  "ok",
  "okay",
  "ok thanks",
  "okay thanks",
  "sure",
  "ready",
  "ready now",
  "lets go",
  "let's go",
  "got it",
  "got you",
  "sounds good",
  "sounds great",
  "no problem",
  "thank you",
  "thanks",
  "cool",
  "right",
  "all good",
  "loud and clear",
  "i can hear you",
  "i can hear you okay",
  "i can hear you now",
  "yes i can hear you",
  "yes i can",
  "testing",
  "test",
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
  /^i can hear you(?: (?:fine|okay|now|clearly))?$/,
  /^yes i can hear you(?: (?:fine|okay|now|clearly))?$/,
  /^loud and clear(?: now)?$/,
  /^all good(?: here)?$/,
  /^ready(?: now)?$/,
  /^lets go$/,
  /^let's go$/,
  /^good (?:morning|afternoon|evening)$/,
  /^thanks(?: a lot)?$/,
  /^thank you(?: very much)?$/,
]

const LOW_SIGNAL_WORDS = new Set([
  "all",
  "can",
  "clear",
  "fine",
  "go",
  "good",
  "got",
  "hear",
  "hello",
  "hey",
  "hi",
  "i",
  "is",
  "it",
  "lets",
  "let's",
  "loud",
  "me",
  "morning",
  "now",
  "okay",
  "ok",
  "problem",
  "ready",
  "right",
  "sounds",
  "sure",
  "test",
  "testing",
  "thanks",
  "thank",
  "that",
  "there",
  "us",
  "working",
  "yeah",
  "yep",
  "yes",
  "you",
])

const GENERIC_CLAIM_EXACT_MATCHES = new Set([
  "emerging theme",
  "key theme",
  "theme",
  "pain point",
  "pain points",
  "opportunity",
  "opportunities",
  "risk",
  "risks",
  "challenge",
  "challenges",
  "issue",
  "issues",
  "concern",
  "concerns",
  "tension",
  "tensions",
  "stakeholder concern",
  "stakeholder concerns",
  "workshop opportunity",
  "workshop opportunities",
  "representative quote",
  "important quote",
  "quote",
])

const GENERIC_CLAIM_WORDS = new Set([
  "concern",
  "challenge",
  "emerging",
  "important",
  "issue",
  "key",
  "opportunity",
  "pain",
  "point",
  "problem",
  "quote",
  "representative",
  "risk",
  "signal",
  "stakeholder",
  "theme",
  "tension",
  "workshop",
])

const THEME_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "around",
  "at",
  "between",
  "for",
  "in",
  "into",
  "of",
  "on",
  "the",
  "to",
  "with",
])

const THEME_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bdecision rights?\b/g, "decision ownership"],
  [/\bdecision making\b/g, "decision ownership"],
  [/\bowners?\b/g, "ownership"],
  [/\baccountability\b/g, "ownership"],
  [/\bauthority\b/g, "ownership"],
  [/\bsign[\s-]?offs?\b/g, "approval"],
  [/\bapprovals?\b/g, "approval"],
  [/\bbottlenecks?\b/g, "bottleneck"],
  [/\bslowdowns?\b/g, "bottleneck"],
  [/\bdelays?\b/g, "bottleneck"],
  [/\bstalls?\b/g, "bottleneck"],
  [/\bwaiting\b/g, "bottleneck"],
  [/\bexceptions?\b/g, "exception"],
  [/\bregional\b/g, "region"],
  [/\blocal\b/g, "region"],
  [/\bdelegated\b/g, "delegate"],
  [/\bdelegation\b/g, "delegate"],
  [/\bduplicated\b/g, "duplicate"],
  [/\bduplication\b/g, "duplicate"],
  [/\bmisaligned\b/g, "misalignment"],
  [/\bmisalignment\b/g, "misalignment"],
  [/\balignment\b/g, "alignment"],
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
  const words = normalized.split(" ").filter(Boolean)

  if (wordCount <= 2 && /^(yes|yeah|yep|ok|okay|sure|thanks?)$/.test(normalized)) {
    return true
  }

  if (wordCount <= 4 && words.every((word) => LOW_SIGNAL_WORDS.has(word))) {
    return true
  }

  return false
}

export function isGenericClaimLabel(value: string) {
  const normalized = normalizeSignalText(value)

  if (!normalized) {
    return true
  }

  if (GENERIC_CLAIM_EXACT_MATCHES.has(normalized)) {
    return true
  }

  const tokens = normalized.split(" ").filter(Boolean)

  return (
    tokens.length <= 3 && tokens.every((token) => GENERIC_CLAIM_WORDS.has(token))
  )
}

export function canonicalizeThemeLabel(value: string) {
  let normalized = normalizeSignalText(value)

  for (const [pattern, replacement] of THEME_PHRASE_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement)
  }

  const tokens = normalized
    .split(" ")
    .filter(Boolean)
    .map((token) => {
      if (token.endsWith("ies")) {
        return `${token.slice(0, -3)}y`
      }

      if (token.endsWith("s") && token.length > 3) {
        return token.slice(0, -1)
      }

      return token
    })
    .filter((token) => !THEME_STOP_WORDS.has(token))

  return [...new Set(tokens)].sort().join(" ")
}

export function listEvidenceSegmentKeys(
  evidence: Array<{ sessionId?: string; segmentIds: string[] }>
) {
  return evidence.flatMap((ref) =>
    [...new Set(ref.segmentIds)].map((segmentId) =>
      ref.sessionId ? `${ref.sessionId}:${segmentId}` : segmentId
    )
  )
}

export function countUniqueEvidenceSegments(
  evidence: Array<{ sessionId?: string; segmentIds: string[] }>
) {
  return new Set(listEvidenceSegmentKeys(evidence)).size
}

export function countDistinctEvidenceSessions(
  evidence: Array<{ sessionId?: string; segmentIds: string[] }>
) {
  return new Set(
    evidence
      .map((ref) => ref.sessionId)
      .filter((sessionId): sessionId is string => typeof sessionId === "string")
  ).size
}

export function getSingleSegmentEvidenceKey(
  evidence: Array<{ sessionId?: string; segmentIds: string[] }>
) {
  const uniqueKeys = [...new Set(listEvidenceSegmentKeys(evidence))]
  return uniqueKeys.length === 1 ? uniqueKeys[0] : null
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

  const maxLength = lowSignal
    ? 220
    : segment.speaker === "participant"
      ? 640
      : 480

  return `${current.text} ${segment.text}`.trim().length <= maxLength
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
