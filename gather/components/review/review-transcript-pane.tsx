"use client"

import { useEffect, useRef } from "react"

import { Badge } from "@/components/ui/badge"
import type { TranscriptSegment } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

import { useReviewSelection } from "./review-selection-context"

interface ReviewTranscriptPaneProps {
  segments: TranscriptSegment[]
  emptyState?: React.ReactNode
}

export function ReviewTranscriptPane({
  segments,
  emptyState,
}: ReviewTranscriptPaneProps) {
  if (segments.length === 0) {
    return <div className="space-y-3">{emptyState}</div>
  }

  return (
    <div className="space-y-3">
      {segments.map((segment) => (
        <TranscriptSegmentCard key={segment.id} segment={segment} />
      ))}
    </div>
  )
}

function TranscriptSegmentCard({ segment }: { segment: TranscriptSegment }) {
  const selection = useReviewSelection()
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) {
      return
    }
    selection.registerSegment(segment.id, node)
    return () => {
      selection.unregisterSegment(segment.id, node)
    }
  }, [segment.id, selection])

  const isHovered = selection.hoveredSegmentIds.has(segment.id)
  const isActive = selection.activeSegmentIds.has(segment.id)

  return (
    <div
      ref={ref}
      data-segment-id={segment.id}
      className={cn(
        "rounded-2xl border border-border/70 bg-background/70 p-4 transition-all",
        isHovered && "border-primary/50 bg-primary/8",
        isActive &&
          "border-primary bg-primary/12 shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
      )}
    >
      <Badge
        variant={
          segment.speaker === "participant"
            ? "accent"
            : segment.speaker === "agent"
              ? "neutral"
              : "warning"
        }
      >
        {segment.speaker}
      </Badge>
      <p className="mt-3 text-sm leading-6 text-foreground">{segment.text}</p>
    </div>
  )
}
