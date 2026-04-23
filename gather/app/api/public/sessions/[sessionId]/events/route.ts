import { NextResponse } from "next/server"
import { z } from "zod"

import { appendSessionEvents } from "@/lib/data/repository"

const eventSchema = z.object({
  segments: z
    .array(
      z.object({
        sourceItemId: z.string().min(1).optional(),
        speaker: z.enum(["participant", "agent", "system"]),
        text: z.string().min(1),
        startOffsetMs: z.number().optional(),
        endOffsetMs: z.number().optional(),
      })
    )
    .optional(),
  runtime: z
    .object({
      state: z
        .enum([
          "pre_start",
          "consent",
          "metadata_collection",
          "intro",
          "question_active",
          "follow_up",
          "question_summary_confirm",
          "question_advance",
          "wrap_up",
          "paused",
          "complete",
          "abandoned",
        ])
        .optional(),
      activeQuestionId: z.string().min(1).nullable().optional(),
      askedQuestionIds: z.array(z.string().min(1)).optional(),
      remainingQuestionIds: z.array(z.string().min(1)).optional(),
      followUpCount: z.number().int().min(0).optional(),
      elapsedSeconds: z.number().min(0).optional(),
      questionElapsedSeconds: z.number().min(0).optional(),
      noveltyScore: z.number().min(0).max(1).optional(),
      repetitionScore: z.number().min(0).max(1).optional(),
      coverageConfidence: z.number().min(0).max(1).optional(),
      introDeliveredAt: z.string().min(1).optional(),
      readinessDetectedAt: z.string().min(1).optional(),
      interviewStartedAt: z.string().min(1).optional(),
      pausedAt: z.string().min(1).nullable().optional(),
    })
    .optional(),
})

const validatedEventSchema = eventSchema.refine(
  (payload) =>
    (payload.segments?.length ?? 0) > 0 || payload.runtime !== undefined,
  {
    message: "At least one transcript segment or runtime event is required.",
  }
)

interface RouteContext {
  params: Promise<{
    sessionId: string
  }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const { sessionId } = await params
  const payload = validatedEventSchema.safeParse(
    await request.json().catch(() => ({}))
  )

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid transcript event payload." },
      { status: 400 }
    )
  }

  const appended = await appendSessionEvents(sessionId, payload.data)

  if (!appended) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 })
  }

  return NextResponse.json({ accepted: appended.length })
}
