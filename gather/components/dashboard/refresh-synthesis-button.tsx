"use client"

import { useTransition } from "react"

import { refreshSynthesisAction } from "@/app/app/actions"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"

interface RefreshSynthesisButtonProps {
  projectId: string
}

export function RefreshSynthesisButton({ projectId }: RefreshSynthesisButtonProps) {
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    const formData = new FormData()
    formData.set("projectId", projectId)

    startTransition(async () => {
      try {
        await refreshSynthesisAction(formData)
        toast({
          title: "Synthesis refresh queued.",
          description: "Themes will update once the run finishes.",
          variant: "success",
        })
      } catch {
        toast({
          title: "Couldn't queue the refresh.",
          description: "Please try again in a moment.",
          variant: "danger",
        })
      }
    })
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      title="Includes all non-excluded interviews."
    >
      {pending ? "Queuing…" : "Re-run synthesis"}
    </Button>
  )
}
