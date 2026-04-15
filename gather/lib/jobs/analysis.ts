import type { AnalysisJob, AnalysisJobType } from "@/lib/domain/types"

export const SESSION_ANALYSIS_JOB_TYPES: AnalysisJobType[] = [
  "transcript_cleaning",
  "session_extraction",
  "quality_scoring",
]

export const ANALYSIS_JOB_TYPES: AnalysisJobType[] = [
  ...SESSION_ANALYSIS_JOB_TYPES,
  "project_synthesis",
]

export function buildCompletionJobs(
  sessionId: string,
  projectId: string
): AnalysisJob[] {
  const now = new Date().toISOString()

  return SESSION_ANALYSIS_JOB_TYPES.map((type) => ({
    id: `${type}-${sessionId}`,
    type,
    status: "queued",
    projectId,
    sessionId,
    payload: { sessionId, projectId },
    attempts: 0,
    maxAttempts: 5,
    nextAttemptAt: now,
    createdAt: now,
  }))
}
