import { NextResponse } from "next/server"

import { logBraintrustTrace } from "@/lib/braintrust/client"
import { completeParticipantSession } from "@/lib/data/repository"

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

  await logBraintrustTrace({
    session: result.session,
  })

  return NextResponse.json({
    session: result.session,
    jobCount: result.jobs.length,
  })
}
