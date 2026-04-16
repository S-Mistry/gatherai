"use client"

import { useFormStatus } from "react-dom"

import { saveSessionOverrideAction } from "@/app/app/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface ReviewOverrideFormProps {
  projectId: string
  sessionId: string
  defaultSummary: string
  defaultNotes: string
  generatedSummary: string
  overrideActive: boolean
}

function SaveButton({ overrideActive }: { overrideActive: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? "Saving…" : overrideActive ? "Update override" : "Save override"}
    </Button>
  )
}

export function ReviewOverrideForm({
  projectId,
  sessionId,
  defaultSummary,
  defaultNotes,
  generatedSummary,
  overrideActive,
}: ReviewOverrideFormProps) {
  return (
    <form action={saveSessionOverrideAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="editedSummary" className="text-sm font-medium">
            Summary used in synthesis
          </label>
          {overrideActive ? (
            <span className="text-[10px] tracking-[0.18em] text-primary uppercase">
              Override active
            </span>
          ) : null}
        </div>
        <Textarea
          id="editedSummary"
          name="editedSummary"
          defaultValue={defaultSummary || generatedSummary}
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Replaces the generated summary that project synthesis consumes. Raw
          transcript and generated artifacts remain unchanged.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="consultantNotes" className="text-sm font-medium">
          Consultant notes
        </label>
        <Textarea
          id="consultantNotes"
          name="consultantNotes"
          defaultValue={defaultNotes}
        />
      </div>

      <div className="flex justify-end">
        <SaveButton overrideActive={overrideActive} />
      </div>
    </form>
  )
}
