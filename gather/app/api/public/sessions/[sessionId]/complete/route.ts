import { NextResponse } from "next/server"
import { z } from "zod"

import { logBraintrustTrace } from "@/lib/braintrust/client"
import {
  getSessionAnalysisTracePayload,
  completeParticipantSession,
  processCompletedSessionAnalysis,
} from "@/lib/data/repository"

const completeRequestSchema = z.object({
  elapsedSeconds: z.number().min(0).optional(),
  questionElapsedSeconds: z.number().min(0).optional(),
})

interface RouteContext {
  params: Promise<{
    sessionId: string
  }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const { sessionId } = await params
  const payload = completeRequestSchema.safeParse(
    await request.json().catch(() => ({}))
  )

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid completion payload." },
      { status: 400 }
    )
  }

  const result = await completeParticipantSession(sessionId, payload.data)

  if (!result) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 })
  }

  let dispatchedJobs = 0

  try {
    const processedJobs = await processCompletedSessionAnalysis(
      result.session.id,
      result.session.projectId
    )
    dispatchedJobs = processedJobs.length
    const tracePayload = await getSessionAnalysisTracePayload(result.session.id)

    if (tracePayload) {
      void logBraintrustTrace(tracePayload)
    }
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
