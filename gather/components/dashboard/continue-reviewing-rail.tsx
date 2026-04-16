import Link from "next/link"
import { ArrowRight } from "@phosphor-icons/react/dist/ssr"

import { RelativeTime } from "@/components/ui/relative-time"

interface NeedsReviewSession {
  sessionId: string
  projectId: string
  projectName: string
  respondentLabel: string
  lastActivityAt: string
}

interface ContinueReviewingRailProps {
  sessions: NeedsReviewSession[]
}

export function ContinueReviewingRail({ sessions }: ContinueReviewingRailProps) {
  if (sessions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/70 bg-background/40 px-4 py-3 text-sm leading-6 text-muted-foreground">
        Nothing flagged for review right now. Quality issues will surface here
        as interviews complete.
      </p>
    )
  }

  return (
    <ul className="stack gap-1.5">
      {sessions.map((session) => (
        <li key={session.sessionId}>
          <Link
            href={`/app/projects/${session.projectId}/sessions/${session.sessionId}`}
            className="focus-ring group flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-primary/8"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                {session.respondentLabel}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {session.projectName} · last active{" "}
                <RelativeTime date={session.lastActivityAt} />
              </p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
