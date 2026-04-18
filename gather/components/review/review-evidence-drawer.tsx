"use client"

import { Dialog as RadixDialog } from "radix-ui"
import { useMemo, useState } from "react"
import { MagnifyingGlass, Quotes, X } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { TranscriptSegment } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

import { useReviewSelection } from "./review-selection-context"
import { ReviewTranscriptPane } from "./review-transcript-pane"

interface ReviewEvidenceDrawerProps {
  respondentLabel: string
  segments: TranscriptSegment[]
  emptyState?: React.ReactNode
}

export function ReviewEvidenceDrawer({
  respondentLabel,
  segments,
  emptyState,
}: ReviewEvidenceDrawerProps) {
  const selection = useReviewSelection()
  const [query, setQuery] = useState("")
  const selectedSegments = useMemo(
    () =>
      segments.filter((segment) => selection.drawerSegmentIds.has(segment.id)),
    [segments, selection.drawerSegmentIds]
  )

  const filteredSegments = useMemo(() => {
    if (selection.drawerMode === "evidence" && selection.drawerSegmentIds.size > 0) {
      const selectedIndexes = segments.flatMap((segment, index) =>
        selection.drawerSegmentIds.has(segment.id) ? [index] : []
      )
      const contextIndexes = new Set<number>()

      selectedIndexes.forEach((index) => {
        contextIndexes.add(index)
        if (index > 0) {
          contextIndexes.add(index - 1)
        }
        if (index < segments.length - 1) {
          contextIndexes.add(index + 1)
        }
      })

      return segments.filter((_, index) => contextIndexes.has(index))
    }
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) {
      return segments
    }
    return segments.filter((segment) =>
      segment.text.toLowerCase().includes(trimmed)
    )
  }, [segments, query, selection.drawerMode, selection.drawerSegmentIds])

  const title =
    selection.drawerMode === "evidence"
      ? `Evidence · ${selection.drawerSegmentIds.size} ${
          selection.drawerSegmentIds.size === 1 ? "segment" : "segments"
        }`
      : "Full transcript"

  return (
    <RadixDialog.Root
      open={selection.drawerOpen}
      onOpenChange={(open) => {
        if (!open) {
          selection.closeDrawer()
        }
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />
        <RadixDialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col",
            "border-l border-border/70 bg-background/96 shadow-[0_40px_80px_-30px_rgba(23,30,55,0.45)] backdrop-blur",
            "focus:outline-none",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-200",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-150"
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Quotes className="size-3.5 text-primary" weight="fill" />
                <RadixDialog.Title asChild>
                  <h2 className="text-sm font-semibold tracking-tight">
                    {title}
                  </h2>
                </RadixDialog.Title>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {respondentLabel}
              </p>
            </div>
            <RadixDialog.Close asChild>
              <button
                type="button"
                aria-label="Close drawer"
                className="focus-ring -mr-1 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </RadixDialog.Close>
          </div>

          {selection.drawerMode === "transcript" ? (
            <div className="border-b border-border/60 px-5 py-3">
              <label className="relative block">
                <span className="sr-only">Search transcript</span>
                <MagnifyingGlass className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search transcript"
                  className="focus-ring w-full rounded-xl border border-border/70 bg-background/80 py-2 pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
                />
              </label>
            </div>
          ) : selection.drawerSegmentIds.size > 0 ? (
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-2.5">
              <Badge variant="accent">Focused evidence</Badge>
              <span className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                {selectedSegments.length} selected
              </span>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {selection.drawerMode === "evidence" && selectedSegments.length > 0 ? (
              <div className="mb-5 space-y-3">
                <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                  Exact excerpts
                </p>
                <ul className="space-y-2">
                  {selectedSegments.map((segment) => (
                    <li
                      key={segment.id}
                      className="rounded-2xl border border-primary/15 bg-primary/8 px-4 py-3"
                    >
                      <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                        {segment.speaker}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-foreground">
                        “{segment.text}”
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border/60 pt-4">
                  <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                    Transcript context
                  </p>
                </div>
              </div>
            ) : null}
            <ReviewTranscriptPane
              segments={filteredSegments}
              emptyState={
                segments.length === 0
                  ? emptyState
                  : query.trim() ? (
                      <p className="rounded-2xl border border-dashed border-border/70 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                        No segments match &ldquo;{query}&rdquo;.
                      </p>
                    ) : null
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
            {selection.drawerMode === "evidence" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selection.openDrawer("transcript")}
              >
                Open full transcript
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                {filteredSegments.length} of {segments.length} segments
              </span>
            )}
            <RadixDialog.Close asChild>
              <Button variant="secondary" size="sm">
                Close
              </Button>
            </RadixDialog.Close>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
