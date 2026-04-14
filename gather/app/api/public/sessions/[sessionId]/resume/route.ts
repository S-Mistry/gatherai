import { NextResponse } from "next/server"
import { z } from "zod"

import { resumeParticipantSession } from "@/lib/data/mock"

const resumeSchema = z.object({
  recoveryToken: z.string().min(1),
})

interface RouteContext {
  params: Promise<{
    sessionId: string
  }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const { sessionId } = await params
  const payload = resumeSchema.safeParse(await request.json().catch(() => ({})))

  if (!payload.success) {
    return NextResponse.json({ error: "Missing recovery token." }, { status: 400 })
  }

  const session = resumeParticipantSession(sessionId, payload.data.recoveryToken)

  if (!session) {
    return NextResponse.json({ error: "Session cannot be resumed." }, { status: 404 })
  }

  return NextResponse.json({ session })
}
