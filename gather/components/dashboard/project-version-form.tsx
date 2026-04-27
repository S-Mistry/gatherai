"use client"

import { useFormStatus } from "react-dom"

import { saveProjectConfigVersionAction } from "@/app/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ProjectConfigVersion, ProjectRecord } from "@/lib/domain/types"

interface ProjectVersionFormProps {
  project: ProjectRecord
  configVersion: ProjectConfigVersion
}

function SaveButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Creating version…" : "Create new version"}
    </Button>
  )
}

export function ProjectVersionForm({
  project,
  configVersion,
}: ProjectVersionFormProps) {
  return (
    <form action={saveProjectConfigVersionAction} className="space-y-4">
      <input type="hidden" name="projectId" value={project.id} />

      <div className="space-y-2">
        <label htmlFor="projectName" className="text-sm font-medium text-foreground">
          Project name
        </label>
        <Input id="projectName" name="projectName" defaultValue={project.name} />
      </div>

      <div className="space-y-2">
        <label htmlFor="objective" className="text-sm font-medium text-foreground">
          Objective
        </label>
        <Textarea
          id="objective"
          name="objective"
          defaultValue={configVersion.objective}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="areasOfInterest"
            className="text-sm font-medium text-foreground"
          >
            Areas of interest
          </label>
          <Textarea
            id="areasOfInterest"
            name="areasOfInterest"
            defaultValue={configVersion.areasOfInterest.join("\n")}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="requiredQuestions"
            className="text-sm font-medium text-foreground"
          >
            Required questions
          </label>
          <Textarea
            id="requiredQuestions"
            name="requiredQuestions"
            defaultValue={configVersion.requiredQuestions.map((q) => q.prompt).join("\n")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="backgroundContext"
          className="text-sm font-medium text-foreground"
        >
          Background context
        </label>
        <Textarea
          id="backgroundContext"
          name="backgroundContext"
          defaultValue={configVersion.backgroundContext ?? ""}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="durationCapMinutes"
            className="text-sm font-medium text-foreground"
          >
            Duration cap
          </label>
          <Input
            id="durationCapMinutes"
            name="durationCapMinutes"
            type="number"
            min={5}
            max={30}
            defaultValue={configVersion.durationCapMinutes}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="anonymityMode"
            className="text-sm font-medium text-foreground"
          >
            Identity mode
          </label>
          <select
            id="anonymityMode"
            name="anonymityMode"
            defaultValue={configVersion.anonymityMode}
            className=" w-full rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-foreground outline-none"
          >
            <option value="named">Named</option>
            <option value="pseudonymous">Pseudonymous</option>
            <option value="anonymous">Anonymous</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs leading-5 text-muted-foreground">
          Creating a new version updates future participant sessions and the
          active public link. Existing sessions stay pinned to their original
          version.
        </p>
        <SaveButton />
      </div>
    </form>
  )
}
