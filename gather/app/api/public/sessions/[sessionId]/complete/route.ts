import { NextResponse } from "next/server"

import { logBraintrustTrace } from "@/lib/braintrust/client"
import {
  completeParticipantSession,
  processCompletedSessionAnalysis,
} from "@/lib/data/repository"

interface RouteContext {
  params: Promise<{
    sessionId: string
  }>
}

export async function POST(_request: Request, { params }: RouteContext) {
  const { sessionId } = await params
  const result = await completeParticipantSession(sessionId)

  if (!result) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 })
  }

  let dispatchedJobs = 0

  try {
    const [traceResult, processedJobs] = await Promise.all([
      logBraintrustTrace({
        session: result.session,
      }),
      processCompletedSessionAnalysis(
        result.session.id,
        result.session.projectId
      ),
    ])

    dispatchedJobs = processedJobs.length
    void traceResult
  } catch (error) {
    console.error(
      `Unable to dispatch immediate analysis for session ${result.session.id}.`,
      error
    )
  }

  return NextResponse.json({
    session: result.session,
    jobCount: result.jobs.length,
    dispatchedJobs,
  })
}
