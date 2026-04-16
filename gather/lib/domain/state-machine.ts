import type { ProjectConfigVersion, SessionRuntimeState } from "@/lib/domain/types"

export const INTERVIEW_STATES = [
  "pre_start",
  "consent",
  "metadata_collection",
  "intro",
  "question_active",
  "follow_up",
  "question_summary_confirm",
  "question_advance",
  "wrap_up",
  "paused",
  "complete",
  "abandoned",
] as const

export const DEFAULT_RESUME_WINDOW_HOURS = 24
export const DEFAULT_FOLLOW_UP_LIMIT = 2

export function buildInitialRuntimeState(
  config: ProjectConfigVersion,
  now = new Date()
): SessionRuntimeState {
  const hardStopAt = new Date(
    now.getTime() + config.durationCapMinutes * 60 * 1000
  ).toISOString()

  return {
    state: "consent",
    activeQuestionId: config.requiredQuestions[0]?.id,
    askedQuestionIds: [],
    remainingQuestionIds: config.requiredQuestions.map((question) => question.id),
    followUpCount: 0,
    elapsedSeconds: 0,
    questionElapsedSeconds: 0,
    noveltyScore: 1,
    repetitionScore: 0,
    coverageConfidence: 0,
    summaryPending: false,
    hardStopAt,
    introDeliveredAt: undefined,
    readinessDetectedAt: undefined,
    interviewStartedAt: undefined,
    pausedAt: undefined,
  }
}

export function shouldAdvanceQuestion(runtimeState: SessionRuntimeState) {
  return (
    runtimeState.followUpCount >= DEFAULT_FOLLOW_UP_LIMIT ||
    runtimeState.noveltyScore < 0.3 ||
    runtimeState.repetitionScore > 0.65 ||
    runtimeState.coverageConfidence > 0.85
  )
}
