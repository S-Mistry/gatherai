"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import type {
  ParticipantSession,
  QualityScore,
  SessionStatus,
} from "@/lib/domain/types"
import { cn } from "@/lib/utils"

export type ReviewSiblingRailVariant = "compact" | "expanded"

interface ReviewSiblingRailProps {
  projectId: string
  currentSessionId: string
  sessions: ParticipantSession[]
  qualityScores: Record<string, QualityScore | undefined>
  variant?: ReviewSiblingRailVariant
}

function statusTone(status: SessionStatus): "success" | "warning" | "neutral" {
  if (status === "complete") {
    return "success"
  }
  if (status === "in_progress" || status === "paused") {
    return "warning"
  }
  return "neutral"
}

function shortStatus(status: SessionStatus): string {
  switch (status) {
    case "complete":
      return "Done"
    case "in_progress":
      return "Live"
    case "paused":
      return "Paused"
    case "abandoned":
      return "Left"
    default:
      return "New"
  }
}

function useSessionKeyboardNav(
  ordered: ParticipantSession[],
  currentSessionId: string,
  projectId: string
) {
  const router = useRouter()

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.key !== "j" && event.key !== "k") {
        return
      }

      const idx = ordered.findIndex((s) => s.id === currentSessionId)
      if (idx === -1) {
        return
      }
      const next =
        event.key === "j"
          ? ordered[Math.min(ordered.length - 1, idx + 1)]
          : ordered[Math.max(0, idx - 1)]
      if (!next || next.id === currentSessionId) {
        return
      }
      event.preventDefault()
      router.push(`/app/projects/${projectId}/sessions/${next.id}`)
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [ordered, currentSessionId, projectId, router])
}

export function ReviewSiblingRail({
  projectId,
  currentSessionId,
  sessions,
  qualityScores,
  variant = "expanded",
}: ReviewSiblingRailProps) {
  const ordered = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aTime = new Date(a.lastActivityAt).getTime()
      const bTime = new Date(b.lastActivityAt).getTime()
      return bTime - aTime
    })
  }, [sessions])

  useSessionKeyboardNav(ordered, currentSessionId, projectId)

  if (variant === "compact") {
    return (
      <CompactRail
        projectId={projectId}
        currentSessionId={currentSessionId}
        sessions={ordered}
        qualityScores={qualityScores}
      />
    )
  }

  return (
    <ExpandedRail
      projectId={projectId}
      currentSessionId={currentSessionId}
      sessions={ordered}
      qualityScores={qualityScores}
    />
  )
}

function CompactRail({
  projectId,
  currentSessionId,
  sessions,
  qualityScores,
}: {
  projectId: string
  currentSessionId: string
  sessions: ParticipantSession[]
  qualityScores: Record<string, QualityScore | undefined>
}) {
  return (
    <nav
      aria-label="Other sessions in this project"
      className="flex flex-col items-center gap-3"
    >
      <span className="eyebrow text-[9px] tracking-[0.22em]">People</span>
      <ul className="flex max-h-[calc(100vh-12rem)] flex-col gap-2 overflow-y-auto px-0.5">
        {sessions.map((session, idx) => {
          const isActive = session.id === currentSessionId
          const score = qualityScores[session.id]
          const overall = score ? Math.round(score.overall * 100) : null
          const tooltip = [
            session.respondentLabel,
            shortStatus(session.status),
            overall != null ? `${overall}%` : null,
            session.excludedFromSynthesis ? "Excluded" : null,
            session.qualityFlag ? "Flagged" : null,
          ]
            .filter(Boolean)
            .join(" · ")

          return (
            <li key={session.id} className="relative">
              <Link
                href={`/app/projects/${projectId}/sessions/${session.id}`}
                aria-current={isActive ? "page" : undefined}
                title={tooltip}
                className={cn(
                  " relative flex size-9 items-center justify-center rounded-full border text-[11px] font-semibold transition-all",
                  isActive
                    ? "border-primary bg-[var(--clay-soft)] text-primary ring-2 ring-primary/25"
                    : "border-border/70 bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  session.excludedFromSynthesis && !isActive && "opacity-40"
                )}
              >
                <span aria-hidden>{idx + 1}</span>
                {session.qualityFlag ? (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[var(--rose)] ring-2 ring-background"
                  />
                ) : score?.lowQuality ? (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[var(--gold)] ring-2 ring-background"
                  />
                ) : null}
              </Link>
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute top-1/2 -left-2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                />
              ) : null}
            </li>
          )
        })}
      </ul>
      <span className="rounded-md border border-border/50 bg-background/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
        j k
      </span>
    </nav>
  )
}

function ExpandedRail({
  projectId,
  currentSessionId,
  sessions,
  qualityScores,
}: {
  projectId: string
  currentSessionId: string
  sessions: ParticipantSession[]
  qualityScores: Record<string, QualityScore | undefined>
}) {
  return (
    <nav
      aria-label="Other sessions in this project"
      className="flex max-h-[calc(100vh-7rem)] flex-col gap-2 overflow-y-auto pr-1"
    >
      <div className="flex items-center justify-between px-1">
        <span className="eyebrow">Sessions</span>
        <span className="text-[10px] tracking-[0.18em] text-[var(--ink-3)] uppercase">
          j / k
        </span>
      </div>
      <ul className="space-y-1.5">
        {sessions.map((session) => {
          const isActive = session.id === currentSessionId
          const score = qualityScores[session.id]
          const overall = score ? Math.round(score.overall * 100) : null
          return (
            <li key={session.id}>
              <Link
                href={`/app/projects/${projectId}/sessions/${session.id}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  " block rounded-2xl border border-border/70 bg-background/70 px-3 py-2.5 transition-colors",
                  "hover:border-primary/40 hover:bg-[var(--clay-soft)]",
                  isActive &&
                    "border-primary/40 bg-[var(--clay-soft)] ring-2 ring-primary/20"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-sm font-semibold",
                      isActive ? "text-primary" : "text-foreground"
                    )}
                  >
                    {session.respondentLabel}
                  </span>
                  {overall != null ? (
                    <span
                      className={cn(
                        "text-[11px] font-semibold tabular-nums",
                        score?.lowQuality
                          ? "text-[var(--gold)]"
                          : "text-[var(--sage)]"
                      )}
                    >
                      {overall}%
                    </span>
                  ) : null}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Badge variant={statusTone(session.status)}>
                    {shortStatus(session.status)}
                  </Badge>
                  {session.excludedFromSynthesis ? (
                    <Badge variant="warning">Excluded</Badge>
                  ) : null}
                  {session.qualityFlag ? (
                    <Badge variant="danger">Flagged</Badge>
                  ) : null}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
