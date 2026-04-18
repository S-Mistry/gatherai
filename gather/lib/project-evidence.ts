import type {
  ContradictionItem,
  EvidenceRef,
  InsightClaim,
  ParticipantSession,
  ProjectEvidenceClaimKind,
  ProjectEvidenceDrawerPayload,
  ProjectEvidenceSegment,
  ProjectSynthesisGenerated,
  ThemeSummary,
  TranscriptSegment,
} from "@/lib/domain/types"

export const MAX_PROJECT_EVIDENCE_EXCERPTS = 5

export interface ProjectEvidenceClaimDescriptor {
  claimId: string
  kind: ProjectEvidenceClaimKind
  title: string
  summary: string
  contextLabel?: string
  contextItems: string[]
  evidence: EvidenceRef[]
}

export interface ResolveProjectClaimEvidenceInput {
  projectId: string
  projectWorkspaceId: string
  viewerWorkspaceId: string
  kind: ProjectEvidenceClaimKind
  claimId: string
  synthesis: ProjectSynthesisGenerated
  sessions: Array<Pick<ParticipantSession, "id" | "respondentLabel">>
  transcript: TranscriptSegment[]
  maxEvidenceSets?: number
}

export function getProjectEvidenceKindLabel(kind: ProjectEvidenceClaimKind) {
  if (kind === "theme") {
    return "Theme"
  }

  if (kind === "contradiction") {
    return "Contradiction"
  }

  return "Notable quote"
}

export function resolveProjectClaimEvidence({
  projectId,
  projectWorkspaceId,
  viewerWorkspaceId,
  kind,
  claimId,
  synthesis,
  sessions,
  transcript,
  maxEvidenceSets = MAX_PROJECT_EVIDENCE_EXCERPTS,
}: ResolveProjectClaimEvidenceInput): ProjectEvidenceDrawerPayload | null {
  if (projectWorkspaceId !== viewerWorkspaceId) {
    throw new Error("Project evidence access denied.")
  }

  const claim = getProjectEvidenceClaimDescriptor(synthesis, kind, claimId)

  if (!claim) {
    return null
  }

  const displayedEvidence = claim.evidence.slice(
    0,
    Math.max(1, maxEvidenceSets)
  )
  const respondentLabelBySessionId = new Map(
    sessions.map((session) => [session.id, session.respondentLabel] as const)
  )
  const transcriptBySessionId = new Map<string, Map<string, TranscriptSegment>>()

  transcript.forEach((segment) => {
    let segmentsForSession = transcriptBySessionId.get(segment.sessionId)

    if (!segmentsForSession) {
      segmentsForSession = new Map()
      transcriptBySessionId.set(segment.sessionId, segmentsForSession)
    }

    segmentsForSession.set(segment.id, segment)
  })

  const excerpts = displayedEvidence.flatMap((ref) => {
    const segmentsForSession = transcriptBySessionId.get(ref.sessionId)

    if (!segmentsForSession) {
      return []
    }

    const segments = buildOrderedEvidenceSegments(ref, segmentsForSession)

    if (segments.length === 0) {
      return []
    }

    return [
      {
        sessionId: ref.sessionId,
        respondentLabel:
          respondentLabelBySessionId.get(ref.sessionId) ?? "Respondent",
        rationale: ref.rationale,
        segmentIds: ref.segmentIds,
        segments,
        reviewHref: `/app/projects/${projectId}/sessions/${ref.sessionId}`,
      },
    ]
  })

  return {
    projectId,
    claimId: claim.claimId,
    kind: claim.kind,
    title: claim.title,
    summary: claim.summary,
    contextLabel: claim.contextLabel,
    contextItems: claim.contextItems,
    totalEvidenceCount: claim.evidence.length,
    displayedEvidenceCount: displayedEvidence.length,
    excerpts,
  }
}

function buildOrderedEvidenceSegments(
  ref: EvidenceRef,
  segmentsForSession: ReadonlyMap<string, TranscriptSegment>
): ProjectEvidenceSegment[] {
  const seen = new Set<string>()

  return ref.segmentIds
    .flatMap((segmentId) => {
      const segment = segmentsForSession.get(segmentId)
      return segment ? [segment] : []
    })
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .filter((segment) => {
      if (seen.has(segment.id)) {
        return false
      }

      seen.add(segment.id)
      return true
    })
    .map((segment) => ({
      id: segment.id,
      speaker: segment.speaker,
      text: segment.text,
      orderIndex: segment.orderIndex,
    }))
}

export function getProjectEvidenceClaimDescriptor(
  synthesis: ProjectSynthesisGenerated,
  kind: ProjectEvidenceClaimKind,
  claimId: string
): ProjectEvidenceClaimDescriptor | null {
  if (kind === "theme") {
    const claim = synthesis.crossInterviewThemes.find((item) => item.id === claimId)
    return claim ? describeThemeClaim(claim) : null
  }

  if (kind === "contradiction") {
    const claim = synthesis.contradictionMap.find((item) => item.id === claimId)
    return claim ? describeContradictionClaim(claim) : null
  }

  const claim = synthesis.notableQuotesByTheme.find((item) => item.id === claimId)
  return claim ? describeNotableQuoteClaim(claim) : null
}

function describeThemeClaim(theme: ThemeSummary): ProjectEvidenceClaimDescriptor {
  return {
    claimId: theme.id,
    kind: "theme",
    title: theme.title,
    summary: theme.summary,
    contextItems: [],
    evidence: theme.evidence,
  }
}

function describeContradictionClaim(
  contradiction: ContradictionItem
): ProjectEvidenceClaimDescriptor {
  return {
    claimId: contradiction.id,
    kind: "contradiction",
    title: contradiction.topic,
    summary: "",
    contextLabel: "Positions",
    contextItems: contradiction.positions,
    evidence: contradiction.evidence,
  }
}

function describeNotableQuoteClaim(
  quote: InsightClaim
): ProjectEvidenceClaimDescriptor {
  return {
    claimId: quote.id,
    kind: "notable_quote",
    title: quote.label,
    summary: quote.summary,
    contextItems: [],
    evidence: quote.evidence,
  }
}
