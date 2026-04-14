import { NextResponse } from "next/server"
import { z } from "zod"

import { processQueuedJobs } from "@/lib/data/mock"

const dispatchSchema = z.object({
  limit: z.number().int().min(1).max(10).optional(),
})

export async function POST(request: Request) {
  const payload = dispatchSchema.safeParse(await request.json().catch(() => ({})))
  const jobs = processQueuedJobs(payload.success ? payload.data.limit : undefined)

  return NextResponse.json({
    processed: jobs.length,
    jobs,
  })
}
