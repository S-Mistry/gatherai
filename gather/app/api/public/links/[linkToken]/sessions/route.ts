import { NextResponse } from "next/server"
import { z } from "zod"

import { createParticipantSession, getPublicInterviewConfig } from "@/lib/data/mock"

const sessionRequestSchema = z.object({
  metadata: z.record(z.string(), z.string()).optional(),
})

interface RouteContext {
  params: Promise<{
    linkToken: string
  }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const { linkToken } = await params
  const payload = sessionRequestSchema.safeParse(await request.json().catch(() => ({})))

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid session bootstrap payload." },
      { status: 400 }
    )
  }

  const publicConfig = getPublicInterviewConfig(linkToken)

  if (!publicConfig) {
    return NextResponse.json({ error: "Invalid or expired project link." }, { status: 404 })
  }

  const created = createParticipantSession(linkToken, payload.data.metadata)

  if (!created) {
    return NextResponse.json({ error: "Unable to create participant session." }, { status: 500 })
  }

  return NextResponse.json({
    session: created.session,
    recoveryToken: created.recoveryToken,
    publicConfig,
  })
}
