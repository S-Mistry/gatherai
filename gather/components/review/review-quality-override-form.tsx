"use client"

import { useFormStatus } from "react-dom"

import { saveSessionQualityOverrideAction } from "@/app/app/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { SessionQualityOverride } from "@/lib/domain/types"

interface ReviewQualityOverrideFormProps {
  projectId: string
  sessionId: string
  qualityOverride?: SessionQualityOverride
}

function SaveButton({ active }: { active: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : active ? "Update quality rule" : "Save quality rule"}
    </Button>
  )
}

export function ReviewQualityOverrideForm({
  projectId,
  sessionId,
  qualityOverride,
}: ReviewQualityOverrideFormProps) {
  const defaultSetting = qualityOverride
    ? qualityOverride.lowQuality
      ? "manual-low"
      : "manual-healthy"
    : "generated"

  return (
    <form action={saveSessionQualityOverrideAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="space-y-2">
        <label htmlFor="setting" className="text-sm font-medium text-foreground">
          Review status source
        </label>
        <select
          id="setting"
          name="setting"
          defaultValue={defaultSetting}
          className="focus-ring w-full rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-foreground outline-none"
        >
          <option value="generated">Use generated quality score</option>
          <option value="manual-low">Manually mark low quality</option>
          <option value="manual-healthy">Manually mark healthy</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="note" className="text-sm font-medium text-foreground">
          Consultant note
        </label>
        <Textarea
          id="note"
          name="note"
          defaultValue={qualityOverride?.note ?? ""}
          placeholder="Why are you overriding the generated quality judgment?"
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Manual review changes the workspace flag and session filters without
          mutating the generated quality score.
        </p>
      </div>

      <div className="flex justify-end">
        <SaveButton active={Boolean(qualityOverride)} />
      </div>
    </form>
  )
}
