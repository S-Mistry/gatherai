import { NextResponse } from "next/server"

import { getParticipantSession, getPublicInterviewConfig } from "@/lib/data/mock"
import { isRealtimeConfigured } from "@/lib/env"
import { mintRealtimeClientSecret } from "@/lib/openai/realtime"

interface RouteContext {
  params: Promise<{
    sessionId: string
  }>
}

export async function POST(_request: Request, { params }: RouteContext) {
  const { sessionId } = await params
  const session = getParticipantSession(sessionId)

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 })
  }

  const publicConfig = getPublicInterviewConfig(session.publicLinkToken)

  if (!publicConfig) {
    return NextResponse.json({ error: "Project link is no longer valid." }, { status: 404 })
  }

  if (!isRealtimeConfigured) {
    return NextResponse.json(
      {
        error:
          "OpenAI realtime environment is not configured yet. Add OPENAI_API_KEY to enable WebRTC voice sessions.",
      },
      { status: 503 }
    )
  }

  try {
    const clientSecret = await mintRealtimeClientSecret(publicConfig)
    return NextResponse.json(clientSecret)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to mint the realtime client secret.",
      },
      { status: 500 }
    )
  }
}
