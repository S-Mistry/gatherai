"use client"

import { useFormStatus } from "react-dom"

import { saveProjectSynthesisOverrideAction } from "@/app/app/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { ProjectSynthesisOverride } from "@/lib/domain/types"

interface ProjectSynthesisOverrideFormProps {
  projectId: string
  generatedNarrative: string
  override?: ProjectSynthesisOverride
}

function SaveButton({ active }: { active: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : active ? "Update synthesis override" : "Save synthesis override"}
    </Button>
  )
}

export function ProjectSynthesisOverrideForm({
  projectId,
  generatedNarrative,
  override,
}: ProjectSynthesisOverrideFormProps) {
  const overrideActive = Boolean(override?.editedNarrative.trim())

  return (
    <form action={saveProjectSynthesisOverrideAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />

      <div className="space-y-2">
        <label
          htmlFor="editedNarrative"
          className="text-sm font-medium text-foreground"
        >
          Executive summary used in readout
        </label>
        <Textarea
          id="editedNarrative"
          name="editedNarrative"
          defaultValue={override?.editedNarrative || generatedNarrative}
        />
        <p className="text-xs leading-5 text-muted-foreground">
          This layers a consultant-written narrative over the generated project
          synthesis without modifying the underlying synthesis run.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="consultantNotes"
          className="text-sm font-medium text-foreground"
        >
          Consultant notes
        </label>
        <Textarea
          id="consultantNotes"
          name="consultantNotes"
          defaultValue={override?.consultantNotes ?? ""}
        />
      </div>

      <div className="flex justify-end">
        <SaveButton active={overrideActive} />
      </div>
    </form>
  )
}
