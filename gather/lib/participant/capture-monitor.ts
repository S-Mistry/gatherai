import type { PublicInterviewConfig } from "@/lib/domain/types"

export type CaptureTurnSpeaker = "participant" | "agent"
export type CaptureSignal = "none" | "thin" | "substantive" | "high_signal"

export interface CaptureTurn {
  sourceItemId?: string
  speaker: CaptureTurnSpeaker
  text: string
}

export interface CaptureMonitorSnapshot {
  activeQuestionId?: string
  askedQuestionIds: string[]
  remainingQuestionIds: string[]
  followUpCount: number
  noveltyScore: number
  repetitionScore: number
  coverageConfidence: number
  latestParticipantSignal: CaptureSignal
  wrapUpPressure: boolean
  shouldCoach: boolean
  coachingKey?: string
  coachingInstructions?: string
}

const STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "again",
  "and",
  "anything",
  "are",
  "did",
  "for",
  "from",
  "have",
  "how",
  "if",
  "in",
  "is",
  "it",
  "of",
  "or",
  "part",
  "program",
  "should",
  "that",
  "the",
  "this",
  "to",
  "was",
  "we",
  "what",
  "workshop",
  "you",
  "your",
])

const THIN_ANSWER_PATTERNS = [
  /\bnot sure\b/i,
  /\bi don't know\b/i,
  /\bidk\b/i,
  /\bnothing\b/i,
  /\bnope\b/i,
  /\bnone\b/i,
  /\bit was fine\b/i,
  /\ball good\b/i,
  /\bpretty good\b/i,
]

const HIGH_SIGNAL_PATTERNS = [
  /\bbecause\b/i,
  /\bfor example\b/i,
  /\bspecifically\b/i,
  /\bchanged\b/i,
  /\bstarted\b/i,
  /\bstopped\b/i,
  /\busing\b/i,
  /\bunclear\b/i,
  /\bmissing\b/i,
  /\bless useful\b/i,
  /\btoo fast\b/i,
  /\btoo slow\b/i,
  /\bconfusing\b/i,
  /\bfrustrating\b/i,
  /\bhelped\b/i,
  /\bworked\b/i,
  /\bdifferently\b/i,
  /\bimprove\b/i,
  /\bi wish\b/i,
  /\bbut\b/i,
  /\bhowever\b/i,
]

function clampScore(score: number) {
  return Number(Math.max(0, Math.min(1, score)).toFixed(2))
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .match(/[a-z0-9']+/g)
    ?.map((token) => token.replace(/'s$/, "").replace(/s$/, ""))
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token)) ?? []
}

function countWords(text: string) {
  return text.match(/[a-z0-9']+/gi)?.length ?? 0
}

function normalizeTurn(text: string) {
  return tokenize(text).join(" ")
}

function hasQuestionShape(text: string) {
  return (
    text.includes("?") ||
    /^(what|where|when|why|how|who|which|tell me|can you|could you|would you)\b/i.test(
      text.trim()
    )
  )
}

function detectParticipantSignal(text: string): CaptureSignal {
  const wordCount = countWords(text)

  if (wordCount === 0) {
    return "none"
  }

  if (
    wordCount < 8 ||
    THIN_ANSWER_PATTERNS.some((pattern) => pattern.test(text))
  ) {
    return "thin"
  }

  if (
    wordCount >= 35 ||
    (wordCount >= 16 &&
      HIGH_SIGNAL_PATTERNS.some((pattern) => pattern.test(text)))
  ) {
    return "high_signal"
  }

  return "substantive"
}

function matchQuestionId(text: string, config: PublicInterviewConfig) {
  const textTokens = new Set(tokenize(text))
  let bestMatch: { id: string; score: number } | null = null

  for (const question of config.requiredQuestions) {
    const promptTokens = tokenize(question.prompt)

    if (promptTokens.length === 0) {
      continue
    }

    const overlap = promptTokens.filter((token) => textTokens.has(token)).length
    const score = overlap / promptTokens.length
    const enoughOverlap = overlap >= Math.min(3, promptTokens.length)

    if (enoughOverlap && score >= 0.42 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: question.id, score }
    }
  }

  return bestMatch?.id
}

function buildRepetitionScore(participantTurns: CaptureTurn[]) {
  const normalizedTurns = participantTurns
    .map((turn) => normalizeTurn(turn.text))
    .filter(Boolean)

  if (normalizedTurns.length <= 1) {
    return 0
  }

  const uniqueTurns = new Set(normalizedTurns)
  return clampScore(1 - uniqueTurns.size / normalizedTurns.length)
}

function getFeedbackWrapStartSeconds(durationCapMinutes: number) {
  if (durationCapMinutes <= 10) {
    return 8 * 60
  }

  return Math.max(8 * 60, durationCapMinutes * 60 - 2 * 60)
}

function buildFeedbackCoaching({
  config,
  latestParticipant,
  latestParticipantSignal,
  wrapUpPressure,
  remainingQuestionIds,
  activeQuestionId,
  followUpCount,
}: {
  config: PublicInterviewConfig
  latestParticipant?: CaptureTurn
  latestParticipantSignal: CaptureSignal
  wrapUpPressure: boolean
  remainingQuestionIds: string[]
  activeQuestionId?: string
  followUpCount: number
}) {
  const remainingCount = remainingQuestionIds.length
  const latestKey = latestParticipant?.sourceItemId ?? "no-latest"

  if (wrapUpPressure) {
    return {
      key: `wrap:${remainingQuestionIds.join(",") || "covered"}:${latestParticipantSignal}`,
      instructions: [
        "Runtime guidance: you are in the feedback wrap-up window.",
        "Do not open broad new areas unless they are one of the remaining must-ask questions.",
        remainingCount > 0
          ? `Tie off the current thread, then cover the ${remainingCount} remaining must-ask topic(s) briefly.`
          : "Tie off the most useful remaining gap and then wrap up warmly.",
        "Aim to finish soon, while preserving any concrete improvement detail already shared.",
      ].join(" "),
    }
  }

  if (latestParticipantSignal === "high_signal") {
    return {
      key: `probe-high:${latestKey}:${activeQuestionId ?? "open"}`,
      instructions: [
        "Runtime guidance: the participant just gave a high-signal feedback answer.",
        "Ask one focused follow-up now before moving on.",
        "Probe for a concrete example, why it mattered, what changed afterwards, or what should be different next time.",
        "After the thread is clear, return to any uncovered must-ask questions.",
      ].join(" "),
    }
  }

  if (latestParticipantSignal === "thin") {
    return {
      key: `probe-thin:${latestKey}:${activeQuestionId ?? "open"}`,
      instructions: [
        "Runtime guidance: the latest answer is thin or vague.",
        "Ask a short, concrete follow-up before moving on.",
        "Invite one example, one moment, or one reason; keep it easy for the participant to answer.",
      ].join(" "),
    }
  }

  if (remainingCount > 0 && followUpCount >= config.followUpLimit) {
    return {
      key: `return-coverage:${remainingQuestionIds.join(",")}`,
      instructions: [
        "Runtime guidance: return to the next uncovered must-ask question.",
        "Keep the transition natural and concise.",
        "You can come back to interesting detail later if there is still time.",
      ].join(" "),
    }
  }

  return null
}

export function deriveCaptureMonitorSnapshot({
  config,
  turns,
  elapsedSeconds,
  interviewStarted,
}: {
  config: PublicInterviewConfig
  turns: CaptureTurn[]
  elapsedSeconds: number
  interviewStarted: boolean
}): CaptureMonitorSnapshot {
  const askedQuestionIds = new Set<string>()
  const answeredQuestionIds = new Set<string>()
  const participantTurns: CaptureTurn[] = []
  let activeQuestionId: string | undefined
  let followUpCount = 0

  for (const turn of turns) {
    if (turn.speaker === "agent") {
      const matchedQuestionId = matchQuestionId(turn.text, config)

      if (matchedQuestionId) {
        activeQuestionId = matchedQuestionId
        askedQuestionIds.add(matchedQuestionId)
        followUpCount = 0
      } else if (activeQuestionId && hasQuestionShape(turn.text)) {
        followUpCount += 1
      }
    } else {
      participantTurns.push(turn)

      if (activeQuestionId && detectParticipantSignal(turn.text) !== "thin") {
        answeredQuestionIds.add(activeQuestionId)
      }
    }
  }

  const latestParticipant = participantTurns[participantTurns.length - 1]
  const latestParticipantSignal = latestParticipant
    ? detectParticipantSignal(latestParticipant.text)
    : "none"
  const remainingQuestionIds = config.requiredQuestions
    .map((question) => question.id)
    .filter((questionId) => !askedQuestionIds.has(questionId))
  const repetitionScore = buildRepetitionScore(participantTurns)
  const noveltyScore = clampScore(
    (latestParticipantSignal === "high_signal"
      ? 0.95
      : latestParticipantSignal === "substantive"
        ? 0.72
        : latestParticipantSignal === "thin"
          ? 0.28
          : 0.5) -
      repetitionScore * 0.35
  )
  const coverageConfidence =
    config.requiredQuestions.length > 0
      ? clampScore(answeredQuestionIds.size / config.requiredQuestions.length)
      : 1
  const wrapUpPressure =
    config.projectType === "feedback" &&
    interviewStarted &&
    elapsedSeconds >= getFeedbackWrapStartSeconds(config.durationCapMinutes)
  const coaching =
    config.projectType === "feedback" && interviewStarted
      ? buildFeedbackCoaching({
          config,
          latestParticipant,
          latestParticipantSignal,
          wrapUpPressure,
          remainingQuestionIds,
          activeQuestionId,
          followUpCount,
        })
      : null

  return {
    activeQuestionId,
    askedQuestionIds: [...askedQuestionIds],
    remainingQuestionIds,
    followUpCount,
    noveltyScore,
    repetitionScore,
    coverageConfidence,
    latestParticipantSignal,
    wrapUpPressure,
    shouldCoach: Boolean(coaching),
    coachingKey: coaching?.key,
    coachingInstructions: coaching?.instructions,
  }
}

export function buildRuntimePatchFromCaptureSnapshot(
  snapshot: CaptureMonitorSnapshot
) {
  return {
    state: snapshot.wrapUpPressure ? "wrap_up" : "question_active",
    activeQuestionId: snapshot.activeQuestionId ?? null,
    askedQuestionIds: snapshot.askedQuestionIds,
    remainingQuestionIds: snapshot.remainingQuestionIds,
    followUpCount: snapshot.followUpCount,
    noveltyScore: snapshot.noveltyScore,
    repetitionScore: snapshot.repetitionScore,
    coverageConfidence: snapshot.coverageConfidence,
  } as const
}
