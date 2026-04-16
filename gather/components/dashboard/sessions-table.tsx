import Link from "next/link"
import { ArrowRight } from "@phosphor-icons/react/dist/ssr"

import { SessionExclusionToggle } from "@/components/dashboard/session-exclusion-toggle"
import { Badge } from "@/components/ui/badge"
import { RelativeTime } from "@/components/ui/relative-time"
import type {
  ParticipantSession,
  QualityScore,
  SessionStatus,
} from "@/lib/domain/types"
import { cn } from "@/lib/utils"

interface SessionsTableProps {
  projectId: string
  sessions: ParticipantSession[]
  qualityScores: Record<string, QualityScore | undefined>
}

function statusVariant(status: SessionStatus) {
  if (status === "complete") {
    return "success" as const
  }
  if (status === "abandoned") {
    return "danger" as const
  }
  if (status === "in_progress") {
    return "accent" as const
  }
  return "neutral" as const
}

function statusLabel(status: SessionStatus) {
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

export function SessionsTable({
  projectId,
  sessions,
  qualityScores,
}: SessionsTableProps) {
  if (sessions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/70 bg-background/40 px-4 py-6 text-center text-sm leading-6 text-muted-foreground">
        No participant sessions yet. Share the public link to start collecting
        interviews.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/60">
      <div className="hidden grid-cols-[minmax(0,1.4fr)_5rem_5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 bg-background/40 px-4 py-2.5 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase md:grid">
        <span>Respondent</span>
        <span>Status</span>
        <span className="text-right tabular-nums">Quality</span>
        <span>Activity</span>
        <span className="text-right">Actions</span>
      </div>
      <ul>
        {sessions.map((session, idx) => {
          const score = qualityScores[session.id]
          const overall = score ? Math.round(score.overall * 100) : null
          return (
            <li
              key={session.id}
              className={cn(
                "grid grid-cols-1 gap-2 px-4 py-3 transition-colors hover:bg-primary/5",
                "md:grid-cols-[minmax(0,1.4fr)_5rem_5rem_minmax(0,1fr)_auto] md:items-center md:gap-3",
                idx > 0 && "border-t border-border/60"
              )}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link
                    href={`/app/projects/${projectId}/sessions/${session.id}`}
                    className="truncate text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {session.respondentLabel}
                  </Link>
                  {session.qualityFlag ? (
                    <Badge variant="warning">Flagged</Badge>
                  ) : null}
                  {session.excludedFromSynthesis ? (
                    <Badge variant="danger">Excluded</Badge>
                  ) : null}
                </div>
              </div>

              <div>
                <Badge variant={statusVariant(session.status)}>
                  {statusLabel(session.status)}
                </Badge>
              </div>

              <div className="text-right text-sm font-semibold tabular-nums">
                {overall != null ? (
                  <span
                    className={cn(
                      score?.lowQuality
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-emerald-700 dark:text-emerald-300"
                    )}
                  >
                    {overall}%
                  </span>
                ) : (
                  <span className="text-muted-foreground/70">—</span>
                )}
              </div>

              <div className="text-xs leading-5 text-muted-foreground">
                Last active <RelativeTime date={session.lastActivityAt} />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <SessionExclusionToggle
                  projectId={projectId}
                  sessionId={session.id}
                  excluded={session.excludedFromSynthesis}
                  respondentLabel={session.respondentLabel}
                />
                <Link
                  href={`/app/projects/${projectId}/sessions/${session.id}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/8 hover:text-primary"
                >
                  Review
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
