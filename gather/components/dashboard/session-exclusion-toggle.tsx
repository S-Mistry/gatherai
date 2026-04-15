"use client"

import { useTransition } from "react"

import { toggleSessionExclusionAction } from "@/app/app/actions"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"

interface SessionExclusionToggleProps {
  projectId: string
  sessionId: string
  excluded: boolean
  respondentLabel: string
}

export function SessionExclusionToggle({
  projectId,
  sessionId,
  excluded,
  respondentLabel,
}: SessionExclusionToggleProps) {
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()

  function applyToggle(nextExcluded: boolean, options: { announce: boolean }) {
    const formData = new FormData()
    formData.set("projectId", projectId)
    formData.set("sessionId", sessionId)
    formData.set("excluded", nextExcluded ? "true" : "false")

    startTransition(async () => {
      try {
        await toggleSessionExclusionAction(formData)
        if (!options.announce) return

        toast({
          title: nextExcluded
            ? `Excluded ${respondentLabel} from synthesis.`
            : `Included ${respondentLabel} in synthesis.`,
          description: "Re-run synthesis to refresh the themes.",
          variant: "success",
          durationMs: 6000,
          action: {
            label: "Undo",
            onClick: () => applyToggle(!nextExcluded, { announce: false }),
          },
        })
      } catch {
        toast({
          title: "That didn't work.",
          description: "Please try again in a moment.",
          variant: "danger",
        })
      }
    })
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => applyToggle(!excluded, { announce: true })}
    >
      {excluded ? "Include" : "Exclude"}
    </Button>
  )
}
