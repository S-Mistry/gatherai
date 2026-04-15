import { NextResponse } from "next/server"
import { z } from "zod"

import { appendTranscriptSegments } from "@/lib/data/repository"

const eventSchema = z.object({
  segments: z.array(
    z.object({
      sourceItemId: z.string().min(1).optional(),
      speaker: z.enum(["participant", "agent", "system"]),
      text: z.string().min(1),
      startOffsetMs: z.number().optional(),
      endOffsetMs: z.number().optional(),
    })
  ),
})

interface RouteContext {
  params: Promise<{
    sessionId: string
  }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const { sessionId } = await params
  const payload = eventSchema.safeParse(await request.json().catch(() => ({})))

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid transcript event payload." },
      { status: 400 }
    )
  }

  const appended = await appendTranscriptSegments(
    sessionId,
    payload.data.segments
  )

  if (!appended) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 })
  }

  return NextResponse.json({ accepted: appended.length })
}
