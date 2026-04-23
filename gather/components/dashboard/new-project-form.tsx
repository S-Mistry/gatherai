"use client"

import type { KeyboardEvent, ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import {
  ArrowRight,
  ChatCircleDots,
  Clock,
  Detective,
  NotePencil,
  Plus,
  Sparkle,
  X,
} from "@phosphor-icons/react"

import { createProjectAction } from "@/app/app/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AnonymityMode, ProjectType } from "@/lib/domain/types"
import { getParticipantDurationCopy } from "@/lib/participant/time-copy"
import {
  DEFAULT_CREATE_PROJECT_TYPE,
  getCreateProjectTypeOptions,
  getProjectTypePreset,
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
    description: "Responses stay tied to each participant's name.",
  },
  {
    value: "pseudonymous",
    label: "Pseudonymous",
    description: "Labels preserve context while names stay private.",
  },
  {
    value: "anonymous",
    label: "Anonymous",
    description: "No name, no role. Just the response.",
  },
]

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="lg" disabled={pending} className="min-w-[180px]">
      {pending ? "Creating project…" : "Create project"}
    </Button>
  )
}

export function NewProjectForm({
  discoveryEnabled,
}: {
  discoveryEnabled: boolean
}) {
  const availableProjectTypes = getCreateProjectTypeOptions(discoveryEnabled)
  const [projectType, setProjectType] = useState<ProjectType>(
    availableProjectTypes[0] ?? DEFAULT_CREATE_PROJECT_TYPE
  )
  const preset = getProjectTypePreset(projectType)

  const [name, setName] = useState("")
  const [objective, setObjective] = useState(preset.objective)
  const [areasOfInterest, setAreasOfInterest] = useState<string[]>(
    preset.areasOfInterest
  )
  const [requiredQuestions, setRequiredQuestions] = useState<string[]>(
    preset.requiredQuestions
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
    setAreasOfInterest(nextPreset.areasOfInterest)
    setRequiredQuestions(nextPreset.requiredQuestions)
    setDurationCapMinutes(String(nextPreset.durationCapMinutes))
    setAnonymityMode(nextPreset.anonymityMode)
  }

  const previewAnalysisHeadings = [
    "Executive narrative",
    preset.implicationsLabel,
    "Recommended actions",
    preset.focusAreasLabel,
  ]
  const previewDurationMinutes = Number(durationCapMinutes)
  const previewDurationCopy = getParticipantDurationCopy(
    projectType,
    Number.isFinite(previewDurationMinutes)
      ? previewDurationMinutes
      : preset.durationCapMinutes
  )

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px] xl:items-start">
      <form action={createProjectAction} className="stack gap-6">
        <input type="hidden" name="projectType" value={projectType} />

        <section className="panel-flush overflow-hidden">
          <header className="flex flex-col justify-between gap-3 px-6 py-5 lg:flex-row lg:items-end">
            <div className="stack gap-1">
              <p className="eyebrow-sm">New project</p>
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                Start a new project
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {availableProjectTypes.length > 1
                  ? "Pick a mode. We'll tune the questions, pacing, and synthesis to match."
                  : "Set up a post-experience feedback project. We'll tune the questions, pacing, and synthesis for you."}
              </p>
            </div>
            <Badge variant="accent">{preset.label}</Badge>
          </header>

          <div className="divider" />

          <div className="stack gap-6 px-6 py-6">
            <section className="stack gap-4">
              <div className="stack gap-1">
                <p className="eyebrow-sm">Mode</p>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {availableProjectTypes.length > 1
                    ? "What are you trying to learn?"
                    : "How should this collection run?"}
                </h2>
              </div>

              <div
                className={cn(
                  "grid gap-3",
                  availableProjectTypes.length > 1 ? "lg:grid-cols-2" : "max-w-xl"
                )}
              >
                {availableProjectTypes.map((type) => {
                  const typePreset = getProjectTypePreset(type)
                  const typeDurationCopy = getParticipantDurationCopy(
                    type,
                    typePreset.durationCapMinutes
                  )
                  const selected = type === projectType

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => applyProjectType(type)}
                      className={cn(
                        "focus-ring group rounded-[28px] border p-5 text-left transition-all",
                        selected
                          ? "border-primary/50 bg-primary/[0.08]"
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
                            "mt-0.5 size-3 shrink-0 rounded-full border transition-colors",
                            selected
                              ? "border-primary bg-primary"
                              : "border-border bg-transparent"
                          )}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        <span className="chip">
                          <Clock className="size-3" />
                          {typeDurationCopy.timerTargetLabel}
                        </span>
                        <span className="chip">
                          <ChatCircleDots className="size-3" />
                          {typePreset.followUpLimit === 1
                            ? "1 probe"
                            : `${typePreset.followUpLimit} probes`}
                        </span>
                        <span className="chip">
                          <NotePencil className="size-3" />
                          {typePreset.anonymityMode}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="stack gap-4">
              <div className="stack gap-1">
                <p className="eyebrow-sm">Essentials</p>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Name it and set the brief
                </h2>
              </div>

              <Field label="Project name" htmlFor="name">
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder={
                    projectType === "discovery"
                      ? "Operating model redesign"
                      : "Saturday dinner feedback"
                  }
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>

              <Field
                label="Objective"
                htmlFor="objective"
                hint="Pre-filled to match your mode. Edit freely."
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
                <BulletListField
                  label="Topics to cover"
                  name="areasOfInterest"
                  items={areasOfInterest}
                  onChange={setAreasOfInterest}
                  addLabel="Add topic"
                  placeholder="e.g. Current blockers"
                />
                <BulletListField
                  label="Must-ask questions"
                  name="requiredQuestions"
                  items={requiredQuestions}
                  onChange={setRequiredQuestions}
                  addLabel="Add question"
                  placeholder="e.g. What would make this useful?"
                  hint="These anchor every conversation."
                />
              </div>
            </section>

            <section className="stack gap-4">
              <div className="stack gap-1">
                <p className="eyebrow-sm">Conversation</p>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  How it runs
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
                    Identity
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
                      ? "One focused probe when it matters."
                      : `Up to ${preset.followUpLimit} probes before moving on.`
                  }
                />
                <RuntimeNote label="Tone" value={preset.toneStyle} />
                <RuntimeNote
                  label="Session model"
                  value="One topic at a time. Transcripts only, no audio stored."
                />
              </div>
            </section>
          </div>

          <div className="divider" />

          <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Saving creates your project and a shareable feedback link, ready
              to send.
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
                <p className="eyebrow-sm">Preview</p>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  How respondents see it
                </h2>
              </div>
              <Badge variant={preset.badgeVariant}>{preset.label}</Badge>
            </div>
          </div>

          <div className="divider" />

          <div className="stack gap-5 px-5 py-5">
            <section className="rounded-[28px] border border-border/70 bg-background/75 p-5">
              <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                Respondent intro
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
                Synthesis
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
                Defaults
              </p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                <li>{previewDurationCopy.shellLabel} One topic at a time.</li>
                <li>
                  {preset.followUpLimit === 1
                    ? "Light follow-ups keep reflections easy to give."
                    : "Deeper probing gives enough context to frame a decision."}
                </li>
                <li>Built for {preset.audiencePlural}, not generic survey takers.</li>
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

function BulletListField({
  label,
  name,
  hint,
  items,
  onChange,
  addLabel,
  placeholder,
}: {
  label: string
  name: string
  hint?: string
  items: string[]
  onChange: (items: string[]) => void
  addLabel: string
  placeholder?: string
}) {
  const itemRefs = useRef<(HTMLTextAreaElement | null)[]>([])
  const pendingFocusRef = useRef<number | null>(null)

  const visibleItems = items.length === 0 ? [""] : items
  const serialized = visibleItems
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n")

  useEffect(() => {
    const target = pendingFocusRef.current
    if (target === null) return
    const el = itemRefs.current[target]
    if (el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
    pendingFocusRef.current = null
  }, [items])

  function updateItem(index: number, value: string) {
    const cleaned = value.replace(/\n+/g, " ")
    onChange(visibleItems.map((item, idx) => (idx === index ? cleaned : item)))
  }
  function insertItemAfter(index: number) {
    const next = [...visibleItems]
    next.splice(index + 1, 0, "")
    pendingFocusRef.current = index + 1
    onChange(next)
  }
  function removeItem(index: number) {
    const next = visibleItems.filter((_, idx) => idx !== index)
    pendingFocusRef.current = Math.max(0, index - 1)
    onChange(next.length === 0 ? [""] : next)
  }
  function addItem() {
    pendingFocusRef.current = visibleItems.length
    onChange([...visibleItems, ""])
  }
  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    index: number
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      insertItemAfter(index)
    } else if (
      event.key === "Backspace" &&
      visibleItems[index] === "" &&
      visibleItems.length > 1
    ) {
      event.preventDefault()
      removeItem(index)
    }
  }

  return (
    <div className="stack gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input type="hidden" name={name} value={serialized} />
      <div className="max-h-64 overflow-y-auto pr-1">
        <ul className="stack gap-2">
          {visibleItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-[1.1rem] size-1.5 shrink-0 rounded-full bg-muted-foreground/50"
              />
              <textarea
                ref={(el) => {
                  itemRefs.current[idx] = el
                }}
                rows={1}
                value={item}
                onChange={(event) => updateItem(idx, event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, idx)}
                placeholder={placeholder}
                className="w-full resize-none rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm leading-6 text-foreground shadow-sm outline-none transition [field-sizing:content] placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10 dark:bg-card/70"
              />
              {visibleItems.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  aria-label="Remove item"
                  className="focus-ring mt-2 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={addItem}
        className="focus-ring inline-flex items-center gap-1.5 self-start rounded-full border border-dashed border-border/70 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Plus className="size-3" weight="bold" />
        {addLabel}
      </button>
      {hint ? (
        <span className="text-xs leading-5 text-muted-foreground">{hint}</span>
      ) : null}
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
