"use client"

import { CaretRight } from "@phosphor-icons/react"

import type { ThemeSummary } from "@/lib/domain/types"

interface ThemeEvidenceDrawerProps {
  themes: ThemeSummary[]
}

export function ThemeEvidenceDrawer({ themes }: ThemeEvidenceDrawerProps) {
  if (themes.length === 0) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        Themes appear here once enough sessions are complete.
      </p>
    )
  }

  return (
    <div className="stack gap-0">
      {themes.map((theme, idx) => (
        <ThemeRow
          key={theme.id}
          theme={theme}
          hasDivider={idx > 0}
        />
      ))}
    </div>
  )
}

function ThemeRow({
  theme,
  hasDivider,
}: {
  theme: ThemeSummary
  hasDivider: boolean
}) {
  const evidenceCount = theme.evidence.length

  return (
    <details
      className={`group ${hasDivider ? "border-t border-border/60" : ""} [&_summary::-webkit-details-marker]:hidden`}
    >
      <summary className="focus-ring flex cursor-pointer list-none items-start gap-2 rounded-md py-3 outline-none">
        <CaretRight
          className="mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          weight="bold"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              {theme.title}
            </h3>
            <span className="eyebrow-sm">
              {theme.frequency} session{theme.frequency === 1 ? "" : "s"}
              {evidenceCount > 0
                ? ` · ${evidenceCount} quote${evidenceCount === 1 ? "" : "s"}`
                : ""}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {theme.summary}
          </p>
        </div>
      </summary>
      <div className="pt-2 pb-4 pl-6">
        {evidenceCount === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            No linked quotes yet. Re-run synthesis after more sessions complete.
          </p>
        ) : (
          <ul className="stack gap-2">
            {theme.evidence.map((ref, index) => (
              <li
                key={`${ref.sessionId}-${index}`}
                className="rounded-2xl border border-border/60 bg-background/60 p-3"
              >
                <p className="text-sm leading-6 text-foreground">
                  {ref.rationale}
                </p>
                <p className="mt-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                  {ref.segmentIds.length} segment
                  {ref.segmentIds.length === 1 ? "" : "s"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  )
}
