"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { ProjectEvidenceDrawer } from "@/components/dashboard/project-evidence-drawer"
import { Spectrogram, StickyNote } from "@/components/ui/ornaments"
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
  totalSessions: number
}

const STICKY_TINTS: Array<"cream" | "peach" | "sage" | "lilac"> = [
  "cream",
  "peach",
  "sage",
  "cream",
  "lilac",
  "peach",
  "sage",
]
const STICKY_ROTS = [-2, 1.5, -1.8, 1, -1.2, 2, -0.5]
const STICKY_SPANS = [5, 4, 3, 5, 3, 4, 5]

export function ProjectEvidenceSurface({
  projectId,
  contradictions,
  notableQuotes,
  themes,
  totalSessions,
}: ProjectEvidenceSurfaceProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedClaim, setSelectedClaim] =
    useState<ProjectEvidenceClaimPreview | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  )
  const [payload, setPayload] = useState<ProjectEvidenceDrawerPayload | null>(
    null
  )
  const [errorMessage, setErrorMessage] = useState<string>()
  const cacheRef = useRef(new Map<string, ProjectEvidenceDrawerPayload>())
  const controllerRef = useRef<AbortController | null>(null)

  const openClaim = useCallback(
    async (claim: ProjectEvidenceClaimPreview) => {
      const cacheKey = `${projectId}:${claim.kind}:${claim.claimId}`
      const cached = cacheRef.current.get(cacheKey)

      controllerRef.current?.abort()
      setSelectedClaim(claim)
      setDrawerOpen(true)

      if (cached) {
        controllerRef.current = null
        setStatus("ready")
        setPayload(cached)
        setErrorMessage(undefined)
        return
      }

      const controller = new AbortController()
      controllerRef.current = controller
      const params = new URLSearchParams({
        kind: claim.kind,
        claimId: claim.claimId,
      })

      setStatus("loading")
      setPayload(null)
      setErrorMessage(undefined)

      try {
        const response = await fetch(
          `/api/projects/${projectId}/evidence?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        )
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

        if (controller.signal.aborted) {
          return
        }

        const nextPayload = body as ProjectEvidenceDrawerPayload
        cacheRef.current.set(cacheKey, nextPayload)
        setPayload(nextPayload)
        setStatus("ready")
      } catch (error: unknown) {
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
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null
        }
      }
    },
    [projectId]
  )

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  const includedTotal = Math.max(totalSessions, 1)

  return (
    <>
      <Section
        title="Themes"
        helper="— pulled from every transcript"
        empty={
          themes.length === 0
            ? "Themes appear here once enough sessions are complete."
            : null
        }
      >
        <div className="grid gap-3">
          {themes.map((theme, i) => {
            const sentiment = sentimentFor(i, theme.frequency)
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => openClaim(toThemeClaim(theme))}
                className="card flat project-evidence-theme-row grid text-left"
                style={{
                  padding: "20px 26px",
                  gap: 28,
                  cursor: "pointer",
                  border: "none",
                }}
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 2,
                        transform: "rotate(45deg)",
                        background: sentiment.color,
                      }}
                    />
                    <span className="eyebrow">
                      {String(i + 1).padStart(2, "0")} · {sentiment.label}
                    </span>
                  </div>
                  <h4
                    className="font-serif"
                    style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 400,
                      lineHeight: 1.2,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {theme.title}
                  </h4>
                </div>
                <p
                  className="font-sans"
                  style={{
                    color: "var(--ink-2)",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {theme.summary}
                </p>
                <div>
                  <Spectrogram
                    frequency={theme.frequency}
                    total={includedTotal}
                    color={sentiment.color}
                  />
                  <div
                    className="font-mono mt-1 text-[10px]"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {theme.frequency}/{includedTotal} interviews
                  </div>
                </div>
                <span className="font-sans text-[12px] text-[var(--ink-3)]">
                  evidence ↗
                </span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section
        title="In their words"
        helper="— read these before drafting anything"
        empty={
          notableQuotes.length === 0
            ? "Notable quotes appear here once synthesis runs."
            : null
        }
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}
        >
          {notableQuotes.slice(0, 7).map((quote, i) => {
            const tint = STICKY_TINTS[i % STICKY_TINTS.length]
            const rot = STICKY_ROTS[i % STICKY_ROTS.length]
            const span = STICKY_SPANS[i % STICKY_SPANS.length]
            return (
              <div key={quote.id} style={{ gridColumn: `span ${span}` }}>
                <button
                  type="button"
                  onClick={() => openClaim(toNotableQuoteClaim(quote))}
                  style={{
                    border: "none",
                    padding: 0,
                    background: "transparent",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                  }}
                >
                  <StickyNote tint={tint} rotate={rot}>
                    <div
                      className="font-hand"
                      style={{
                        fontSize: quote.summary.length > 120 ? 22 : 26,
                        lineHeight: 1.25,
                        color: "var(--ink)",
                      }}
                    >
                      &ldquo;{quote.summary}&rdquo;
                    </div>
                    <div
                      className="flex items-baseline justify-between mt-3.5"
                    >
                      <span
                        className="font-mono text-[10px]"
                        style={{ letterSpacing: ".15em", color: "var(--ink-2)" }}
                      >
                        — {quote.label.toLowerCase()}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--ink-3)]">
                        {quote.evidence.length} evidence
                      </span>
                    </div>
                  </StickyNote>
                </button>
              </div>
            )
          })}
        </div>
      </Section>

      <Section
        title="Where they disagree"
        helper="— bring these to the table"
        empty={
          contradictions.length === 0
            ? "No cross-session contradictions surfaced yet."
            : null
        }
      >
        <div className="grid gap-3.5">
          {contradictions.map((item) => {
            const aCount = item.evidence.length
            const bCount = item.evidence.length
            const positions = item.positions
            const a = positions[0] ?? "—"
            const b = positions[1] ?? "—"
            return (
              <div key={item.id} className="card flat" style={{ padding: "24px 28px" }}>
                <div className="flex items-baseline justify-between mb-4">
                  <h4
                    className="font-serif"
                    style={{ margin: 0, fontSize: 22, fontWeight: 400 }}
                  >
                    {item.topic}
                  </h4>
                  <button
                    type="button"
                    onClick={() => openClaim(toContradictionClaim(item))}
                    className="font-sans text-[12px] text-[var(--ink-3)]"
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    evidence ↗
                  </button>
                </div>
                <div
                  className="project-evidence-contradiction-grid grid items-center"
                  style={{ gap: 20 }}
                >
                  <div
                    style={{
                      padding: "18px 20px",
                      background: "var(--gold-soft)",
                      border: "1px solid rgba(200,160,60,0.3)",
                      borderRadius: 8,
                    }}
                  >
                    <div className="flex justify-between mb-2.5">
                      <span className="eyebrow">position a</span>
                      <span className="font-mono text-[10px] text-[var(--ink-3)]">
                        {aCount} evidence
                      </span>
                    </div>
                    <div className="font-serif" style={{ fontSize: 17, lineHeight: 1.45 }}>
                      {a}
                    </div>
                  </div>
                  <VersusAxis a={aCount} b={bCount} />
                  <div
                    style={{
                      padding: "18px 20px",
                      background: "var(--sage-soft)",
                      border: "1px solid rgba(120,160,100,0.3)",
                      borderRadius: 8,
                    }}
                  >
                    <div className="flex justify-between mb-2.5">
                      <span className="eyebrow">position b</span>
                      <span className="font-mono text-[10px] text-[var(--ink-3)]">
                        {bCount} evidence
                      </span>
                    </div>
                    <div className="font-serif" style={{ fontSize: 17, lineHeight: 1.45 }}>
                      {b}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

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

function Section({
  title,
  helper,
  empty,
  children,
}: {
  title: string
  helper?: string
  empty?: string | null
  children: ReactNode
}) {
  return (
    <section style={{ marginBottom: 56 }}>
      <div className="section-head">
        <h2 className="font-serif" style={{ fontSize: 32, fontWeight: 400 }}>
          {title}
        </h2>
        {helper ? (
          <span className="font-hand" style={{ fontSize: 20, color: "var(--ink-3)" }}>
            {helper}
          </span>
        ) : null}
      </div>
      {empty ? (
        <p
          className="font-sans"
          style={{
            color: "var(--ink-3)",
            fontSize: 14,
            border: "1.5px dashed var(--line)",
            borderRadius: 8,
            padding: "18px 20px",
          }}
        >
          {empty}
        </p>
      ) : (
        children
      )}
    </section>
  )
}

function VersusAxis({ a, b }: { a: number; b: number }) {
  return (
    <div className="text-center">
      <div
        className="font-mono mb-2"
        style={{
          fontSize: 10,
          letterSpacing: ".16em",
          color: "var(--ink-3)",
          textTransform: "uppercase",
        }}
      >
        split
      </div>
      <div
        className="flex"
        style={{
          height: 10,
          background: "var(--cream-2)",
          borderRadius: 5,
          overflow: "hidden",
          border: "1px solid var(--line-soft)",
        }}
      >
        <span style={{ flex: a, background: "var(--gold)" }} />
        <span style={{ flex: b, background: "var(--sage)" }} />
      </div>
      <div
        className="font-hand mt-1.5"
        style={{ fontSize: 22, color: "var(--clay)" }}
      >
        {a} ↔ {b}
      </div>
    </div>
  )
}

function sentimentFor(i: number, frequency: number) {
  if (frequency >= 5) return { label: "friction", color: "var(--clay)" }
  if (i % 3 === 0) return { label: "opportunity", color: "var(--sage)" }
  if (i % 3 === 1) return { label: "risk", color: "var(--rose)" }
  return { label: "signal", color: "var(--gold)" }
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
