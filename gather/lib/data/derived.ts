import type { SessionStatus } from "@/lib/domain/types"

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
