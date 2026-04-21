"use client"

import { Quotes } from "@phosphor-icons/react"

import type { EvidenceRef } from "@/lib/domain/types"
import { cn } from "@/lib/utils"

import { useOptionalReviewSelectionActions } from "./review-selection-context"

interface EvidencePillProps {
  evidence: EvidenceRef[]
  className?: string
}

export function EvidencePill({ evidence, className }: EvidencePillProps) {
  const selection = useOptionalReviewSelectionActions()

  const segmentIds = evidence.flatMap((ref) => ref.segmentIds)
  const uniqueIds = Array.from(new Set(segmentIds))
  const count = uniqueIds.length

  if (count === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-dashed border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground",
          className
        )}
      >
        <Quotes className="size-3" />
        No evidence
      </span>
    )
  }

  const label = count === 1 ? "1 excerpt" : `${count} excerpts`
  const rationale = evidence.find((ref) => ref.rationale)?.rationale

  return (
    <button
      type="button"
      onMouseEnter={() => selection?.setHovered(uniqueIds)}
      onMouseLeave={() => selection?.setHovered(null)}
      onFocus={() => selection?.setHovered(uniqueIds)}
      onBlur={() => selection?.setHovered(null)}
      onClick={() => {
        if (!selection) {
          return
        }
        const isXl =
          typeof window !== "undefined" &&
          window.matchMedia("(min-width: 1280px)").matches
        if (isXl) {
          selection.focusSegments(uniqueIds)
        } else {
          selection.openDrawer("evidence", uniqueIds)
        }
      }}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors",
        "hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40",
        className
      )}
      title={rationale ?? "Jump to transcript evidence"}
    >
      <Quotes className="size-3" weight="fill" />
      {label}
    </button>
  )
}
