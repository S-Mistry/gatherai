"use client"

import { FileText } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"

import { useOptionalReviewSelectionActions } from "./review-selection-context"

export function ReviewTranscriptDrawerButton() {
  const selection = useOptionalReviewSelectionActions()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => selection?.openDrawer("transcript")}
    >
      <FileText className="size-3.5" />
      Open transcript drawer
    </Button>
  )
}
