"use client"

import { Quotes } from "@phosphor-icons/react"
import { useEffect, useState, type ReactNode } from "react"

import { ProjectEvidenceDrawer } from "@/components/dashboard/project-evidence-drawer"
import { Badge } from "@/components/ui/badge"
import type {
  ContradictionItem,
  InsightClaim,
  ProjectEvidenceDrawerPayload,
  ThemeSummary,
} from "@/lib/domain/types"

import type { ProjectEvidenceClaimPreview } from "./project-evidence-drawer"

interface ProjectEvidenceSurfaceProps {
  projectId: string
  contradictions: ContradictionItem[]
  notableQuotes: InsightClaim[]
  themes: ThemeSummary[]
}

export function ProjectEvidenceSurface({
  projectId,
  contradictions,
  notableQuotes,
  themes,
}: ProjectEvidenceSurfaceProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedClaim, setSelectedClaim] =
    useState<ProjectEvidenceClaimPreview | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  )
  const [payload, setPayload] = useState<ProjectEvidenceDrawerPayload | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    if (!selectedClaim) {
      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams({
      kind: selectedClaim.kind,
      claimId: selectedClaim.claimId,
    })

    void fetch(`/api/projects/${projectId}/evidence?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as
          | ProjectEvidenceDrawerPayload
          | { error?: string }

        if (!response.ok) {
          throw new Error(
            "error" in body && typeof body.error === "string"
              ? body.error
              : "Unable to load project evidence."
          )
        }

        return body as ProjectEvidenceDrawerPayload
      })
      .then((nextPayload) => {
        if (controller.signal.aborted) {
          return
        }

        setPayload(nextPayload)
        setStatus("ready")
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        setPayload(null)
        setStatus("error")
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load project evidence."
        )
      })

    return () => controller.abort()
  }, [projectId, requestVersion, selectedClaim])

  function openClaim(claim: ProjectEvidenceClaimPreview) {
    setSelectedClaim(claim)
    setDrawerOpen(true)
    setStatus("loading")
    setPayload(null)
    setErrorMessage(undefined)
    setRequestVersion((value) => value + 1)
  }

  return (
    <>
      <section className="stack gap-5 px-6 py-5">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="stack gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="eyebrow-sm">Contradictions</h2>
              <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                cross-session tensions
              </span>
            </div>
            {contradictions.length === 0 ? (
              <EmptyPanel message="No cross-session contradictions were grounded yet." />
            ) : (
              <div className="stack gap-3">
                {contradictions.map((item) => (
                  <ClaimButton
                    key={item.id}
                    claim={toContradictionClaim(item)}
                    onClick={openClaim}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {item.topic}
                      </h3>
                      <Badge variant="warning">
                        {item.evidence.length} evidence set
                        {item.evidence.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground marker:text-muted-foreground">
                      {item.positions.map((position) => (
                        <li key={position}>{position}</li>
                      ))}
                    </ul>
                  </ClaimButton>
                ))}
              </div>
            )}
          </section>

          <section className="stack gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="eyebrow-sm">Notable quotes</h2>
              <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                by theme
              </span>
            </div>
            {notableQuotes.length === 0 ? (
              <EmptyPanel message="No notable cross-interview quotes were captured yet." />
            ) : (
              <div className="stack gap-3">
                {notableQuotes.map((quote) => (
                  <ClaimButton
                    key={quote.id}
                    claim={toNotableQuoteClaim(quote)}
                    onClick={openClaim}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="accent">{quote.label}</Badge>
                      <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                        {quote.evidence.length} evidence set
                        {quote.evidence.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {quote.summary}
                    </p>
                  </ClaimButton>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <div className="divider" />

      <section className="stack gap-3 px-6 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="eyebrow-sm">Themes across interviews</h2>
          <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            open exact excerpts
          </span>
        </div>
        {themes.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Themes appear here once enough sessions are complete.
          </p>
        ) : (
          <div className="stack gap-3">
            {themes.map((theme) => (
              <ClaimButton
                key={theme.id}
                claim={toThemeClaim(theme)}
                onClick={openClaim}
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {theme.title}
                  </h3>
                  <span className="eyebrow-sm">
                    {theme.frequency} session{theme.frequency === 1 ? "" : "s"} ·{" "}
                    {theme.evidence.length} evidence set
                    {theme.evidence.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {theme.summary}
                </p>
              </ClaimButton>
            ))}
          </div>
        )}
      </section>

      <ProjectEvidenceDrawer
        open={drawerOpen}
        claim={selectedClaim}
        payload={payload}
        status={status}
        errorMessage={errorMessage}
        onOpenChange={setDrawerOpen}
      />
    </>
  )
}

function ClaimButton({
  claim,
  children,
  onClick,
  className,
}: {
  claim: ProjectEvidenceClaimPreview
  children: ReactNode
  onClick: (claim: ProjectEvidenceClaimPreview) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(claim)}
      className={`focus-ring w-full rounded-3xl border border-border/70 bg-background/60 p-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/8 ${className ?? ""}`}
    >
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary">
          <Quotes className="size-3" weight="fill" />
          {claim.evidenceCount} evidence set
          {claim.evidenceCount === 1 ? "" : "s"}
        </span>
        <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          Open drawer
        </span>
      </div>
    </button>
  )
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <p className="rounded-3xl border border-dashed border-border/70 bg-background/40 px-4 py-6 text-sm leading-6 text-muted-foreground">
      {message}
    </p>
  )
}

function toThemeClaim(theme: ThemeSummary): ProjectEvidenceClaimPreview {
  return {
    claimId: theme.id,
    kind: "theme",
    title: theme.title,
    summary: theme.summary,
    contextItems: [],
    evidenceCount: theme.evidence.length,
  }
}

function toContradictionClaim(
  item: ContradictionItem
): ProjectEvidenceClaimPreview {
  return {
    claimId: item.id,
    kind: "contradiction",
    title: item.topic,
    summary: "",
    contextLabel: "Positions",
    contextItems: item.positions,
    evidenceCount: item.evidence.length,
  }
}

function toNotableQuoteClaim(quote: InsightClaim): ProjectEvidenceClaimPreview {
  return {
    claimId: quote.id,
    kind: "notable_quote",
    title: quote.label,
    summary: quote.summary,
    contextItems: [],
    evidenceCount: quote.evidence.length,
  }
}
