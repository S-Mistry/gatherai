import { NextResponse } from "next/server"

import { env } from "@/lib/env"
import { recoverAndProcessQueuedJobs } from "@/lib/data/repository"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const headerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const querySecret = searchParams.get("cronSecret")
  const hasVercelCronHeader = Boolean(request.headers.get("x-vercel-cron"))
  const authorized =
    hasVercelCronHeader ||
    (!!env.CRON_SECRET &&
      (headerSecret === env.CRON_SECRET || querySecret === env.CRON_SECRET))

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 })
  }

  const jobs = await recoverAndProcessQueuedJobs(8)

  return NextResponse.json({
    recovered: jobs.length,
    jobs,
  })
}
