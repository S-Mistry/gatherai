"use client"

import type { ComponentType, ReactNode } from "react"
import { useState } from "react"
import { useFormStatus } from "react-dom"
import {
  ArrowRight,
  ChatCircleDots,
  Clock,
  Detective,
  NotePencil,
  Sparkle,
} from "@phosphor-icons/react"

import { createProjectAction } from "@/app/app/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AnonymityMode, ProjectType } from "@/lib/domain/types"
import {
  getProjectTypePreset,
  PROJECT_TYPE_ORDER,
} from "@/lib/project-types"
import { cn } from "@/lib/utils"

const ANONYMITY_OPTIONS: Array<{
  value: AnonymityMode
  label: string
  description: string
}> = [
  {
    value: "named",
    label: "Named",
    description: "Each response stays attributable by name.",
  },
  {
    value: "pseudonymous",
    label: "Pseudonymous",
    description: "Responses keep context, but names stay hidden behind labels.",
  },
  {
    value: "anonymous",
    label: "Anonymous",
    description: "No name or role is attached to what someone says.",
  },
]

function formatLines(lines: string[]) {
  return lines.join("\n")
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="lg" disabled={pending} className="min-w-[180px]">
      {pending ? "Creating project…" : "Create project"}
    </Button>
  )
}

export function NewProjectForm() {
  const [projectType, setProjectType] = useState<ProjectType>("discovery")
  const preset = getProjectTypePreset(projectType)

  const [name, setName] = useState("")
  const [clientName, setClientName] = useState("")
  const [objective, setObjective] = useState(preset.objective)
  const [areasOfInterest, setAreasOfInterest] = useState(
    formatLines(preset.areasOfInterest)
  )
  const [requiredQuestions, setRequiredQuestions] = useState(
    formatLines(preset.requiredQuestions)
  )
  const [durationCapMinutes, setDurationCapMinutes] = useState(
    String(preset.durationCapMinutes)
  )
  const [anonymityMode, setAnonymityMode] = useState<AnonymityMode>(
    preset.anonymityMode
  )

  function applyProjectType(type: ProjectType) {
    const nextPreset = getProjectTypePreset(type)
    setProjectType(type)
    setObjective(nextPreset.objective)
    setAreasOfInterest(formatLines(nextPreset.areasOfInterest))
    setRequiredQuestions(formatLines(nextPreset.requiredQuestions))
    setDurationCapMinutes(String(nextPreset.durationCapMinutes))
    setAnonymityMode(nextPreset.anonymityMode)
  }

  const previewAnalysisHeadings = [
    "Executive narrative",
    preset.implicationsLabel,
    "Recommended actions",
    preset.focusAreasLabel,
  ]

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px] xl:items-start">
      <form action={createProjectAction} className="stack gap-6">
        <input type="hidden" name="projectType" value={projectType} />

        <section className="panel-flush overflow-hidden">
          <div className="relative overflow-hidden px-6 py-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(43,91,255,0.12),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(12,173,124,0.12),transparent_38%)]" />
            <div className="relative stack gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">New project</Badge>
                <span className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                  one flow, two routes
                </span>
              </div>
              <div className="stack gap-2">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance">
                  Choose the collection mode first, then shape the conversation.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                  Discovery and feedback share the same engine, but the participant
                  framing, defaults, and synthesis language should not be forced
                  into one generic setup.
                </p>
              </div>
            </div>
          </div>

          <div className="divider" />

          <div className="stack gap-6 px-6 py-6">
            <section className="stack gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="stack gap-1">
                  <p className="eyebrow-sm">Type</p>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    Pick the route this project is taking
                  </h2>
                </div>
                <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  visible branching
                </span>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {PROJECT_TYPE_ORDER.map((type) => {
                  const typePreset = getProjectTypePreset(type)
                  const selected = type === projectType

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => applyProjectType(type)}
                      className={cn(
                        "focus-ring group rounded-[28px] border p-5 text-left transition-all",
                        selected
                          ? "border-primary/50 bg-primary/[0.08] shadow-[0_20px_45px_-30px_rgba(43,91,255,0.55)]"
                          : "border-border/70 bg-background/75 hover:border-primary/30 hover:bg-primary/[0.04]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={typePreset.badgeVariant}>
                              {typePreset.label}
                            </Badge>
                            {type === "discovery" ? (
                              <Detective className="size-4 text-muted-foreground" />
                            ) : (
                              <Sparkle className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-sm leading-6 text-foreground">
                            {typePreset.description}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "mt-0.5 size-3 rounded-full border transition-colors",
                            selected
                              ? "border-primary bg-primary"
                              : "border-border bg-transparent"
                          )}
                        />
                      </div>

                      <div className="mt-5 grid gap-2 sm:grid-cols-3">
                        <PreviewMetric
                          icon={Clock}
                          label="Duration"
                          value={`~${typePreset.durationCapMinutes} min`}
                        />
                        <PreviewMetric
                          icon={ChatCircleDots}
                          label="Follow-up"
                          value={
                            typePreset.followUpLimit === 1
                              ? "1 focused probe"
                              : `${typePreset.followUpLimit} probes max`
                          }
                        />
                        <PreviewMetric
                          icon={NotePencil}
                          label="Identity"
                          value={typePreset.anonymityMode}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="stack gap-4">
              <div className="stack gap-1">
                <p className="eyebrow-sm">What you need to learn</p>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Start from a strong default, then sharpen the specifics
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Project name" htmlFor="name">
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder={
                      projectType === "discovery"
                        ? "Operating model redesign"
                        : "Leadership cohort retrospective"
                    }
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </Field>
                <Field label="Client or program owner" htmlFor="clientName">
                  <Input
                    id="clientName"
                    name="clientName"
                    required
                    placeholder={
                      projectType === "discovery" ? "Riverstone" : "Northlight Academy"
                    }
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                  />
                </Field>
              </div>

              <Field
                label="Objective"
                htmlFor="objective"
                hint="Switching project type swaps in a mode-appropriate starter objective."
              >
                <Textarea
                  id="objective"
                  name="objective"
                  required
                  rows={4}
                  value={objective}
                  onChange={(event) => setObjective(event.target.value)}
                />
              </Field>

              <div className="grid gap-4 xl:grid-cols-2">
                <Field
                  label="Topics to cover"
                  htmlFor="areasOfInterest"
                  hint="One topic per line."
                >
                  <Textarea
                    id="areasOfInterest"
                    name="areasOfInterest"
                    rows={8}
                    value={areasOfInterest}
                    onChange={(event) => setAreasOfInterest(event.target.value)}
                  />
                </Field>
                <Field
                  label="Must-ask questions"
                  htmlFor="requiredQuestions"
                  hint="One question per line. These become the backbone of the conversation."
                >
                  <Textarea
                    id="requiredQuestions"
                    name="requiredQuestions"
                    rows={8}
                    value={requiredQuestions}
                    onChange={(event) => setRequiredQuestions(event.target.value)}
                  />
                </Field>
              </div>
            </section>

            <section className="stack gap-4">
              <div className="stack gap-1">
                <p className="eyebrow-sm">How the Conversation Runs</p>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Tune the runtime without turning this into survey-builder busywork
                </h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                <Field label="Duration" htmlFor="durationCapMinutes">
                  <Input
                    id="durationCapMinutes"
                    name="durationCapMinutes"
                    type="number"
                    min={4}
                    max={30}
                    value={durationCapMinutes}
                    onChange={(event) => setDurationCapMinutes(event.target.value)}
                  />
                </Field>

                <div className="stack gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Identity handling
                  </span>
                  <div className="grid gap-3 md:grid-cols-3">
                    {ANONYMITY_OPTIONS.map((option) => {
                      const selected = option.value === anonymityMode

                      return (
                        <label
                          key={option.value}
                          className={cn(
                            "focus-ring block cursor-pointer rounded-3xl border px-4 py-4 text-left transition-colors",
                            selected
                              ? "border-primary/50 bg-primary/[0.08]"
                              : "border-border/70 bg-background/70 hover:border-primary/30 hover:bg-primary/[0.04]"
                          )}
                        >
                          <input
                            type="radio"
                            name="anonymityMode"
                            value={option.value}
                            checked={selected}
                            onChange={() => setAnonymityMode(option.value)}
                            className="sr-only"
                          />
                          <p className="text-sm font-semibold text-foreground">
                            {option.label}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {option.description}
                          </p>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <RuntimeNote
                  label="Follow-up depth"
                  value={
                    preset.followUpLimit === 1
                      ? "One focused probe when needed."
                      : `${preset.followUpLimit} follow-up turns max before moving on.`
                  }
                />
                <RuntimeNote label="Tone" value={preset.toneStyle} />
                <RuntimeNote
                  label="Session model"
                  value="Strict mode in v1, with one topic at a time and transcript-only storage."
                />
              </div>
            </section>
          </div>

          <div className="divider" />

          <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Saving creates the project, its first config version, and the public
              participant link immediately.
            </p>
            <SubmitButton />
          </div>
        </section>
      </form>

      <aside className="xl:sticky xl:top-28">
        <section className="panel-flush overflow-hidden">
          <div className="px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="stack gap-1">
                <p className="eyebrow-sm">Live preview</p>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  What this route feels like
                </h2>
              </div>
              <Badge variant={preset.badgeVariant}>{preset.label}</Badge>
            </div>
          </div>

          <div className="divider" />

          <div className="stack gap-5 px-5 py-5">
            <section className="rounded-[28px] border border-border/70 bg-background/75 p-5">
              <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                Participant intro
              </p>
              <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                {preset.participantTitle}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {preset.participantIntro}
              </p>
              <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.07] px-4 py-3">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
                  Disclosure
                </p>
                <ul className="mt-2 space-y-1.5 text-sm leading-6 text-foreground">
                  {preset.disclosureLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-[28px] border border-border/70 bg-background/75 p-5">
              <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                Analysis readout
              </p>
              <div className="mt-4 stack gap-3">
                {previewAnalysisHeadings.map((heading) => (
                  <div
                    key={heading}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/80 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {heading}
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-border/70 bg-background/75 p-5">
              <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                Default posture
              </p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                <li>
                  About {preset.durationCapMinutes} minutes, with one topic at a
                  time.
                </li>
                <li>
                  {preset.followUpLimit === 1
                    ? "Keeps follow-up tight so reflections stay lightweight."
                    : "Allows deeper probing so upcoming decisions are well framed."}
                </li>
                <li>
                  Starts with {preset.audiencePlural} in mind, not generic survey
                  respondents.
                </li>
              </ul>
            </section>
          </div>
        </section>
      </aside>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className="stack gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint ? (
        <span className="text-xs leading-5 text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  )
}

function PreviewMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/75 px-3 py-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function RuntimeNote({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <section className="rounded-3xl border border-border/70 bg-background/70 p-4">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </section>
  )
}
