import type {
  ProjectType,
  SessionStatus,
  TestimonialReviewStatus,
} from "@/lib/domain/types"

export const PROJECT_MOTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export interface SessionProjectMetrics {
  inProgress: number
  completed: number
  abandoned: number
  flagged: number
  includedInSynthesis: number
}

export interface ProjectScopedSessionLike {
  projectId: string
  status: SessionStatus
  qualityFlag: boolean
  excludedFromSynthesis: boolean
}

export interface ProjectMotionSessionLike extends ProjectScopedSessionLike {
  lastActivityAt: string
}

export interface TestimonialActivityReviewLike {
  status: TestimonialReviewStatus
  createdAt: string
  updatedAt: string
}

export interface TestimonialActivityLinkLike {
  updatedAt: string
}

export interface TestimonialProjectMetrics {
  pending: number
  approved: number
  rejected: number
  total: number
  latestActivityAt?: string
}

export type ProjectMotionReason =
  | "testimonial_pending"
  | "testimonial_recent_activity"
  | "session_in_progress"
  | "synthesizing"
  | "flagged_completed_session"
  | "recent_completed_session"
  | "recent_project_activity"
  | "quiet"

export interface ProjectMotionState {
  isInMotion: boolean
  reason: ProjectMotionReason
  latestActivityAt?: string
}

export interface ProjectMotionInput {
  projectType: ProjectType
  status: string
  updatedAt: string
  sessions: ProjectMotionSessionLike[]
  testimonialMetrics?: TestimonialProjectMetrics
  now?: Date
  windowMs?: number
}

export interface NeedsReviewSessionLike {
  id: string
  projectId: string
  respondentLabel: string
  status: SessionStatus
  qualityFlag: boolean
  excludedFromSynthesis: boolean
  lastActivityAt: string
}

export interface NeedsReviewSummary {
  sessionId: string
  projectId: string
  projectName: string
  respondentLabel: string
  lastActivityAt: string
}

export interface LatestBySessionLike {
  sessionId: string
  createdAt: string
}

export function groupByProjectId<T extends { projectId: string }>(rows: T[]) {
  const map = new Map<string, T[]>()

  rows.forEach((row) => {
    const existing = map.get(row.projectId)

    if (existing) {
      existing.push(row)
      return
    }

    map.set(row.projectId, [row])
  })

  return map
}

export function buildSessionMetrics(
  sessions: ProjectScopedSessionLike[]
): SessionProjectMetrics {
  return sessions.reduce<SessionProjectMetrics>(
    (metrics, session) => {
      if (session.status === "in_progress") {
        metrics.inProgress += 1
      }

      if (session.status === "complete") {
        metrics.completed += 1
      }

      if (session.status === "abandoned") {
        metrics.abandoned += 1
      }

      if (session.qualityFlag) {
        metrics.flagged += 1
      }

      if (session.status === "complete" && !session.excludedFromSynthesis) {
        metrics.includedInSynthesis += 1
      }

      return metrics
    },
    {
      inProgress: 0,
      completed: 0,
      abandoned: 0,
      flagged: 0,
      includedInSynthesis: 0,
    }
  )
}

function timestampValue(value: string | undefined) {
  if (!value) return Number.NaN
  return new Date(value).getTime()
}

function latestIso(values: Array<string | undefined>) {
  const latest = values
    .map((value) => ({
      value,
      time: timestampValue(value),
    }))
    .filter(
      (candidate): candidate is { value: string; time: number } =>
        typeof candidate.value === "string" && Number.isFinite(candidate.time)
    )
    .sort((left, right) => right.time - left.time)[0]

  return latest?.value
}

function isRecent(
  value: string | undefined,
  now: Date,
  windowMs: number
) {
  const time = timestampValue(value)

  if (!Number.isFinite(time)) {
    return false
  }

  return time >= now.getTime() - windowMs
}

export function buildTestimonialProjectMetrics(input: {
  reviews: TestimonialActivityReviewLike[]
  links?: TestimonialActivityLinkLike[]
  projectUpdatedAt?: string
}): TestimonialProjectMetrics {
  const pending = input.reviews.filter(
    (review) => review.status === "pending"
  ).length
  const approved = input.reviews.filter(
    (review) => review.status === "approved"
  ).length
  const rejected = input.reviews.filter(
    (review) => review.status === "rejected"
  ).length

  return {
    pending,
    approved,
    rejected,
    total: input.reviews.length,
    latestActivityAt: latestIso([
      input.projectUpdatedAt,
      ...(input.links ?? []).map((link) => link.updatedAt),
      ...input.reviews.flatMap((review) => [
        review.createdAt,
        review.updatedAt,
      ]),
    ]),
  }
}

export function buildProjectMotionState({
  projectType,
  status,
  updatedAt,
  sessions,
  testimonialMetrics,
  now = new Date(),
  windowMs = PROJECT_MOTION_WINDOW_MS,
}: ProjectMotionInput): ProjectMotionState {
  if (projectType === "testimonial") {
    if ((testimonialMetrics?.pending ?? 0) > 0) {
      return {
        isInMotion: true,
        reason: "testimonial_pending",
        latestActivityAt: testimonialMetrics?.latestActivityAt ?? updatedAt,
      }
    }

    const latestActivityAt = testimonialMetrics?.latestActivityAt ?? updatedAt

    if (isRecent(latestActivityAt, now, windowMs)) {
      return {
        isInMotion: true,
        reason: "testimonial_recent_activity",
        latestActivityAt,
      }
    }

    return {
      isInMotion: false,
      reason: "quiet",
      latestActivityAt,
    }
  }

  const latestSessionActivityAt = latestIso(
    sessions.map((session) => session.lastActivityAt)
  )
  const latestActivityAt = latestIso([updatedAt, latestSessionActivityAt])

  if (sessions.some((session) => session.status === "in_progress")) {
    return {
      isInMotion: true,
      reason: "session_in_progress",
      latestActivityAt,
    }
  }

  if (status === "synthesizing") {
    return {
      isInMotion: true,
      reason: "synthesizing",
      latestActivityAt,
    }
  }

  if (
    sessions.some(
      (session) =>
        session.status === "complete" &&
        session.qualityFlag &&
        !session.excludedFromSynthesis
    )
  ) {
    return {
      isInMotion: true,
      reason: "flagged_completed_session",
      latestActivityAt,
    }
  }

  if (
    sessions.some(
      (session) =>
        session.status === "complete" &&
        isRecent(session.lastActivityAt, now, windowMs)
    )
  ) {
    return {
      isInMotion: true,
      reason: "recent_completed_session",
      latestActivityAt,
    }
  }

  if (isRecent(updatedAt, now, windowMs)) {
    return {
      isInMotion: true,
      reason: "recent_project_activity",
      latestActivityAt,
    }
  }

  return {
    isInMotion: false,
    reason: "quiet",
    latestActivityAt,
  }
}

export function buildRecentNeedsReviewSessions(
  sessions: NeedsReviewSessionLike[],
  projectNameById: ReadonlyMap<string, string>,
  limit = 6
): NeedsReviewSummary[] {
  return sessions
    .filter(
      (session) =>
        session.status === "complete" &&
        session.qualityFlag &&
        !session.excludedFromSynthesis
    )
    .sort(
      (left, right) =>
        new Date(right.lastActivityAt).getTime() -
        new Date(left.lastActivityAt).getTime()
    )
    .slice(0, limit)
    .map((session) => ({
      sessionId: session.id,
      projectId: session.projectId,
      projectName: projectNameById.get(session.projectId) ?? "Project",
      respondentLabel: session.respondentLabel,
      lastActivityAt: session.lastActivityAt,
    }))
}

export function selectLatestRowsBySessionId<T extends LatestBySessionLike>(
  rows: T[]
) {
  const latestBySessionId = new Map<string, T>()

  rows.forEach((row) => {
    const existing = latestBySessionId.get(row.sessionId)

    if (!existing) {
      latestBySessionId.set(row.sessionId, row)
      return
    }

    if (
      new Date(row.createdAt).getTime() > new Date(existing.createdAt).getTime()
    ) {
      latestBySessionId.set(row.sessionId, row)
    }
  })

  return Array.from(latestBySessionId.values())
}
