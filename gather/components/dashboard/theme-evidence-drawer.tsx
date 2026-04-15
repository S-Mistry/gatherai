"use client"

import { Dialog } from "radix-ui"
import { X } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
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
    <div className="space-y-3">
      {themes.map((theme) => (
        <ThemeTile key={theme.id} theme={theme} />
      ))}
    </div>
  )
}

function ThemeTile({ theme }: { theme: ThemeSummary }) {
  const evidenceCount = theme.evidence.length

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            "group/tile w-full rounded-3xl border border-border/70 bg-background/70 p-5 text-left transition",
            "hover:border-primary/40 hover:bg-background/90",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">{theme.title}</h2>
            <Badge variant="neutral">
              {theme.frequency} session{theme.frequency === 1 ? "" : "s"}
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{theme.summary}</p>
          {evidenceCount > 0 ? (
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-primary">
              {evidenceCount} quote{evidenceCount === 1 ? "" : "s"} →
            </p>
          ) : null}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out" />
        <Dialog.Content
          className={cn(
            "panel fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-md flex-col gap-4 overflow-y-auto rounded-none rounded-l-[32px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Dialog.Title className="text-lg font-semibold tracking-tight">
                {theme.title}
              </Dialog.Title>
              <Dialog.Description className="text-sm leading-6 text-muted-foreground">
                {theme.summary}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="rounded-full p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">
              {theme.frequency} session{theme.frequency === 1 ? "" : "s"}
            </Badge>
            <Badge variant="accent">
              {evidenceCount} quote{evidenceCount === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Evidence
            </p>
            {evidenceCount === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                No linked quotes yet. Re-run synthesis after more sessions complete.
              </p>
            ) : (
              <ul className="space-y-3">
                {theme.evidence.map((ref, index) => (
                  <li
                    key={`${ref.sessionId}-${index}`}
                    className="rounded-2xl border border-border/70 bg-background/70 p-4"
                  >
                    <p className="text-sm leading-6 text-foreground">{ref.rationale}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {ref.segmentIds.length} segment
                      {ref.segmentIds.length === 1 ? "" : "s"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
