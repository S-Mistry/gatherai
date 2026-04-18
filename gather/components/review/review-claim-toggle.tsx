"use client"

import { useFormStatus } from "react-dom"

import { toggleSessionClaimSuppressionAction } from "@/app/app/actions"
import { Button } from "@/components/ui/button"

interface ReviewClaimToggleProps {
  projectId: string
  sessionId: string
  claimId: string
  suppressed: boolean
}

function ClaimToggleButton({ suppressed }: { suppressed: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="outline" size="xs" disabled={pending}>
      {pending ? "Saving…" : suppressed ? "Restore" : "Suppress"}
    </Button>
  )
}

export function ReviewClaimToggle({
  projectId,
  sessionId,
  claimId,
  suppressed,
}: ReviewClaimToggleProps) {
  return (
    <form action={toggleSessionClaimSuppressionAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="claimId" value={claimId} />
      <input type="hidden" name="suppressed" value={suppressed ? "false" : "true"} />
      <ClaimToggleButton suppressed={suppressed} />
    </form>
  )
}
