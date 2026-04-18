import { NextResponse } from "next/server"
import { z } from "zod"

import { PROJECT_EVIDENCE_CLAIM_KINDS } from "@/lib/domain/types"
import { getProjectClaimEvidence } from "@/lib/data/repository"

const querySchema = z.object({
  kind: z.enum(PROJECT_EVIDENCE_CLAIM_KINDS),
  claimId: z.string().min(1),
})

interface RouteContext {
  params: Promise<{
    projectId: string
  }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const { projectId } = await params
  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    kind: url.searchParams.get("kind"),
    claimId: url.searchParams.get("claimId"),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing or invalid evidence query." },
      { status: 400 }
    )
  }

  try {
    const payload = await getProjectClaimEvidence(
      projectId,
      parsed.data.kind,
      parsed.data.claimId
    )

    if (!payload) {
      return NextResponse.json({ error: "Evidence claim not found." }, { status: 404 })
    }

    return NextResponse.json(payload)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load project evidence."

    if (message === "Consultant authentication is required.") {
      return NextResponse.json({ error: message }, { status: 401 })
    }

    if (message === "Project evidence access denied.") {
      return NextResponse.json({ error: message }, { status: 403 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
