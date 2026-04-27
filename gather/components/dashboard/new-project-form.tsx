"use client"

import type { KeyboardEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"

import { createProjectAction } from "@/app/app/actions"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tape } from "@/components/ui/ornaments"
import { Textarea } from "@/components/ui/textarea"
import type { AnonymityMode, ProjectType } from "@/lib/domain/types"
import { getParticipantDurationCopy } from "@/lib/participant/time-copy"
import {
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
    description: "Responses stay tied to each respondent's name.",
  },
  {
    value: "pseudonymous",
    label: "Pseudonymous",
    description: "Labels keep context. Names stay private.",
  },
  {
    value: "anonymous",
    label: "Anonymous",
    description: "No name, no role. Just the response.",
  },
]

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="clay" size="lg" disabled={pending}>
      {pending ? "Creating…" : label}
    </Button>
  )
}

export function NewProjectForm({
  discoveryEnabled,
}: {
  discoveryEnabled: boolean
}) {
  const availableProjectTypes = getCreateProjectTypeOptions(discoveryEnabled)
  const [pickedType, setPickedType] = useState<ProjectType | null>(
    availableProjectTypes.length === 1 ? availableProjectTypes[0] : null
  )

  return (
    <div className="mx-auto w-full max-w-[980px]">
      {pickedType === null ? (
        <TypePicker
          options={availableProjectTypes}
          onPick={setPickedType}
        />
      ) : (
        <SetupForm
          projectType={pickedType}
          onBack={
            availableProjectTypes.length === 1
              ? undefined
              : () => setPickedType(null)
          }
        />
      )}
    </div>
  )
}

function TypePicker({
  options,
  onPick,
}: {
  options: ProjectType[]
  onPick: (type: ProjectType) => void
}) {
  return (
    <>
      <div className="font-hand mb-2 text-[24px] text-[var(--clay)]">
        what kind of conversation —
      </div>
      <h1
        className="font-serif"
        style={{
          fontSize: 52,
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: "-0.015em",
          margin: "0 0 40px",
        }}
      >
        Two ways to listen.{" "}
        <span style={{ fontStyle: "italic", color: "var(--ink-3)" }}>
          Pick one.
        </span>
      </h1>

      <div className="grid gap-7 lg:grid-cols-2">
        {options.map((type, idx) => {
          const preset = getProjectTypePreset(type)
          const accent = type === "feedback"
            ? "var(--sage)"
            : type === "testimonial"
              ? "var(--ink-2)"
              : "var(--clay)"
          const tape = type === "feedback" ? "green" : "yellow"
          const tilt = idx === 0 ? -0.5 : 0.5
          const tapePos = idx === 0 ? { left: 32 } : { right: 32 }
          const tapeRotate = idx === 0 ? -3 : 3
          const flavor = type === "feedback"
            ? "✶ feedback pulse"
            : type === "testimonial"
              ? "☉ testimonial collection"
              : "☞ stakeholder interviews"

          return (
            <button
              key={type}
              type="button"
              onClick={() => onPick(type)}
              className="text-left"
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transform: `rotate(${tilt}deg)`,
              }}
            >
              <div
                className="card flat relative"
                style={{
                  padding: "30px 32px 28px",
                  minHeight: 280,
                  background: type === "feedback" ? "var(--card-2)" : "var(--card)",
                }}
              >
                <Tape
                  tint={tape}
                  style={{
                    top: -11,
                    transform: `rotate(${tapeRotate}deg)`,
                    ...tapePos,
                  }}
                />
                <div
                  className="font-hand"
                  style={{ fontSize: 30, color: accent, marginBottom: 6 }}
                >
                  {flavor}
                </div>
                <h3
                  className="font-serif"
                  style={{
                    fontSize: 28,
                    fontWeight: 400,
                    margin: "12px 0 16px",
                    lineHeight: 1.18,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {preset.createTitle}
                </h3>
                <p
                  className="font-sans"
                  style={{
                    fontSize: 14,
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {preset.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {chipsForType(type, preset).map((chip) => (
                    <span key={chip} className="chip">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}

function chipsForType(
  type: ProjectType,
  preset: ReturnType<typeof getProjectTypePreset>
) {
  if (type === "testimonial") {
    return ["10 sec", "Voice → text", "Embeddable"]
  }
  if (type === "feedback") {
    return ["Unlimited responses", "No live transcript", "Theme rollup"]
  }
  const duration = getParticipantDurationCopy(type, preset.durationCapMinutes)
  return [
    duration.timerTargetLabel,
    preset.followUpLimit === 1 ? "1 probe" : `${preset.followUpLimit} probes`,
    preset.anonymityMode,
  ]
}

function SetupForm({
  projectType,
  onBack,
}: {
  projectType: ProjectType
  onBack?: () => void
}) {
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
  const [businessName, setBusinessName] = useState("")
  const [businessNameTouched, setBusinessNameTouched] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [brandColor, setBrandColor] = useState("#b45f3a")
  const [headline, setHeadline] = useState("Leave a review")
  const [testimonialPrompt, setTestimonialPrompt] = useState(
    "Tell us about your experience."
  )

  function handleNameChange(value: string) {
    setName(value)
    if (projectType === "testimonial" && !businessNameTouched) {
      setBusinessName(value)
    }
  }

  const testimonialMode = projectType === "testimonial"
  const feedbackMode = projectType === "feedback"
  const stakeholderLike = !testimonialMode && !feedbackMode

  return (
    <form action={createProjectAction} className="space-y-7">
      <input type="hidden" name="projectType" value={projectType} />

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="font-hand"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            color: "var(--ink-3)",
            padding: 0,
          }}
        >
          ← back
        </button>
      ) : null}

      <div>
        <h1
          className="font-serif"
          style={{
            fontSize: 44,
            fontWeight: 400,
            margin: "0 0 6px",
            letterSpacing: "-0.012em",
          }}
        >
          {testimonialMode
            ? "One link. One review."
            : feedbackMode
              ? "One question, sent wide."
              : "Set up the interviews."}
        </h1>
        <div
          className="font-hand"
          style={{
            fontSize: 22,
            color: feedbackMode || testimonialMode ? "var(--sage)" : "var(--clay)",
            marginBottom: 8,
          }}
        >
          {testimonialMode
            ? "keep it simple — they're saying yes already."
            : feedbackMode
              ? "keep it open enough to surprise you —"
              : "you can edit any of this later —"}
        </div>
      </div>

      <div
        className={cn(
          "card",
          stakeholderLike && "lined red-line",
          (testimonialMode || feedbackMode) && "flat"
        )}
        style={{
          padding: stakeholderLike ? "30px 36px 36px 70px" : "30px 36px 36px",
          background:
            testimonialMode || feedbackMode ? "var(--card-2)" : undefined,
        }}
      >
        {(testimonialMode || feedbackMode) && (
          <Tape
            tint={testimonialMode ? "yellow" : "green"}
            style={{ top: -11, left: 60, transform: "rotate(-2deg)" }}
          />
        )}

        {testimonialMode ? (
          <TestimonialFields
            name={name}
            onName={handleNameChange}
            businessName={businessName}
            onBusinessName={(value) => {
              setBusinessNameTouched(true)
              setBusinessName(value)
            }}
            websiteUrl={websiteUrl}
            onWebsiteUrl={setWebsiteUrl}
            brandColor={brandColor}
            onBrandColor={setBrandColor}
            headline={headline}
            onHeadline={setHeadline}
            prompt={testimonialPrompt}
            onPrompt={setTestimonialPrompt}
          />
        ) : feedbackMode ? (
          <FeedbackFields
            name={name}
            onName={handleNameChange}
            requiredQuestions={requiredQuestions}
            onRequiredQuestions={setRequiredQuestions}
            objective={objective}
            onObjective={setObjective}
          />
        ) : (
          <StakeholderFields
            name={name}
            onName={handleNameChange}
            objective={objective}
            onObjective={setObjective}
            areasOfInterest={areasOfInterest}
            onAreasOfInterest={setAreasOfInterest}
            requiredQuestions={requiredQuestions}
            onRequiredQuestions={setRequiredQuestions}
            durationCapMinutes={durationCapMinutes}
            onDurationCapMinutes={setDurationCapMinutes}
            anonymityMode={anonymityMode}
            onAnonymityMode={setAnonymityMode}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          label={
            testimonialMode
              ? "Create review link →"
              : feedbackMode
                ? "Preview & send →"
                : "Save & invite stakeholders →"
          }
        />
        <Button type="button" variant="ghost">
          Save as draft
        </Button>
        <div className="flex-1" />
        <span
          className="font-hand"
          style={{ fontSize: 20, color: "var(--ink-3)" }}
        >
          {testimonialMode
            ? "you'll get a link to embed on your site"
            : feedbackMode
              ? "you'll get a link to share with your team"
              : "you'll get a link to share with each person"}
        </span>
      </div>
    </form>
  )
}

function StakeholderFields({
  name,
  onName,
  objective,
  onObjective,
  areasOfInterest,
  onAreasOfInterest,
  requiredQuestions,
  onRequiredQuestions,
  durationCapMinutes,
  onDurationCapMinutes,
  anonymityMode,
  onAnonymityMode,
}: {
  name: string
  onName: (v: string) => void
  objective: string
  onObjective: (v: string) => void
  areasOfInterest: string[]
  onAreasOfInterest: (v: string[]) => void
  requiredQuestions: string[]
  onRequiredQuestions: (v: string[]) => void
  durationCapMinutes: string
  onDurationCapMinutes: (v: string) => void
  anonymityMode: AnonymityMode
  onAnonymityMode: (v: AnonymityMode) => void
}) {
  return (
    <div className="grid gap-7">
      <Field label="project name" htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          placeholder="Operating model redesign"
          value={name}
          onChange={(event) => onName(event.target.value)}
        />
      </Field>

      <div className="grid gap-7 md:grid-cols-2">
        <Field label="session cap" htmlFor="durationCapMinutes">
          <Input
            id="durationCapMinutes"
            name="durationCapMinutes"
            type="number"
            min={4}
            max={30}
            value={durationCapMinutes}
            onChange={(event) => onDurationCapMinutes(event.target.value)}
          />
        </Field>
        <Field label="identity" htmlFor="anonymityMode">
          <select
            id="anonymityMode"
            name="anonymityMode"
            value={anonymityMode}
            onChange={(event) =>
              onAnonymityMode(event.target.value as AnonymityMode)
            }
          >
            {ANONYMITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.description}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="what you want to learn" htmlFor="objective">
        <Textarea
          id="objective"
          name="objective"
          rows={2}
          required
          value={objective}
          onChange={(event) => onObjective(event.target.value)}
        />
      </Field>

      <NotebookList
        eyebrow="topics to cover —"
        name="areasOfInterest"
        items={areasOfInterest}
        onChange={onAreasOfInterest}
        addLabel="+ add a topic"
        placeholder="e.g. handoff friction"
      />

      <NotebookList
        eyebrow="must-ask questions —"
        name="requiredQuestions"
        items={requiredQuestions}
        onChange={onRequiredQuestions}
        addLabel="+ add a question"
        placeholder="e.g. what would make this useful?"
        numbered
      />
    </div>
  )
}

function FeedbackFields({
  name,
  onName,
  requiredQuestions,
  onRequiredQuestions,
  objective,
  onObjective,
}: {
  name: string
  onName: (v: string) => void
  requiredQuestions: string[]
  onRequiredQuestions: (v: string[]) => void
  objective: string
  onObjective: (v: string) => void
}) {
  const oneQuestion = requiredQuestions[0] ?? ""

  function handleQuestion(value: string) {
    onRequiredQuestions([value])
  }

  return (
    <div className="grid gap-7">
      <Field label="project name" htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          placeholder="Northwind launch retrospective"
          value={name}
          onChange={(event) => onName(event.target.value)}
        />
      </Field>

      <Field label="the one question" htmlFor="requiredQuestions">
        <Textarea
          id="requiredQuestions"
          name="requiredQuestions"
          rows={2}
          required
          value={oneQuestion}
          onChange={(event) => handleQuestion(event.target.value)}
          style={{ fontSize: 24, lineHeight: 1.35 }}
        />
      </Field>

      <Field label="what you want to learn" htmlFor="objective">
        <Textarea
          id="objective"
          name="objective"
          rows={2}
          value={objective}
          onChange={(event) => onObjective(event.target.value)}
        />
      </Field>

      <div
        className="flex items-center gap-3.5 rounded-md"
        style={{
          padding: "14px 18px",
          background: "rgba(255,255,255,0.5)",
        }}
      >
        <span
          className="grid place-items-center"
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "2px solid var(--sage)",
            background: "var(--sage)",
          }}
        >
          <span style={{ color: "var(--card)", fontSize: 12 }}>✓</span>
        </span>
        <div>
          <div className="font-sans" style={{ fontSize: 13, fontWeight: 600 }}>
            Hide the live transcript from participants
          </div>
          <div
            className="font-sans"
            style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}
          >
            They speak; we listen. They see a thank-you. Themes roll up once
            enough have answered.
          </div>
        </div>
      </div>
    </div>
  )
}

function TestimonialFields({
  name,
  onName,
  businessName,
  onBusinessName,
  websiteUrl,
  onWebsiteUrl,
  brandColor,
  onBrandColor,
  headline,
  onHeadline,
  prompt,
  onPrompt,
}: {
  name: string
  onName: (v: string) => void
  businessName: string
  onBusinessName: (v: string) => void
  websiteUrl: string
  onWebsiteUrl: (v: string) => void
  brandColor: string
  onBrandColor: (v: string) => void
  headline: string
  onHeadline: (v: string) => void
  prompt: string
  onPrompt: (v: string) => void
}) {
  return (
    <div className="grid gap-7">
      <Field label="project name" htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          placeholder="Website testimonials"
          value={name}
          onChange={(event) => onName(event.target.value)}
        />
      </Field>

      <div className="grid gap-7 md:grid-cols-2">
        <Field label="business name" htmlFor="testimonialBusinessName">
          <Input
            id="testimonialBusinessName"
            name="testimonialBusinessName"
            required
            placeholder="Your business"
            value={businessName}
            onChange={(event) => onBusinessName(event.target.value)}
          />
        </Field>
        <Field label="website URL" htmlFor="testimonialWebsiteUrl">
          <Input
            id="testimonialWebsiteUrl"
            name="testimonialWebsiteUrl"
            required
            placeholder="https://example.com"
            value={websiteUrl}
            onChange={(event) => onWebsiteUrl(event.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-7 md:grid-cols-[180px_minmax(0,1fr)]">
        <Field label="brand colour" htmlFor="testimonialBrandColor">
          <div className="flex items-center gap-3">
            <input
              id="testimonialBrandColor"
              name="testimonialBrandColor"
              type="color"
              value={brandColor}
              onChange={(event) => onBrandColor(event.target.value)}
              className="size-9 rounded-full border border-[var(--line)] bg-transparent"
            />
            <span className="font-sans text-sm text-[var(--ink-3)]">
              optional
            </span>
          </div>
        </Field>
        <Field label="headline" htmlFor="testimonialHeadline" hint="optional">
          <Input
            id="testimonialHeadline"
            name="testimonialHeadline"
            placeholder="Leave a review"
            value={headline}
            onChange={(event) => onHeadline(event.target.value)}
          />
        </Field>
      </div>

      <Field
        label="prompt question"
        htmlFor="testimonialPrompt"
        hint="shown above the record button"
      >
        <Textarea
          id="testimonialPrompt"
          name="testimonialPrompt"
          rows={3}
          placeholder="Tell us about your experience."
          value={prompt}
          onChange={(event) => onPrompt(event.target.value)}
        />
      </Field>
    </div>
  )
}

function NotebookList({
  eyebrow,
  name,
  items,
  onChange,
  addLabel,
  placeholder,
  numbered = false,
}: {
  eyebrow: string
  name: string
  items: string[]
  onChange: (items: string[]) => void
  addLabel: string
  placeholder?: string
  numbered?: boolean
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
    <div>
      <div
        className="font-hand"
        style={{ fontSize: 22, color: "var(--clay)", marginBottom: 10 }}
      >
        {eyebrow}
      </div>
      <input type="hidden" name={name} value={serialized} />
      <div className="grid gap-3">
        {visibleItems.map((item, idx) => (
          <div
            key={idx}
            className="grid items-center"
            style={{
              gridTemplateColumns: numbered ? "32px 1fr 24px" : "16px 1fr 24px",
              gap: 12,
            }}
          >
            {numbered ? (
              <span
                className="font-hand"
                style={{ fontSize: 24, color: "var(--clay)" }}
              >
                {idx + 1}.
              </span>
            ) : (
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: "var(--ink-4)" }}
              />
            )}
            <textarea
              ref={(el) => {
                itemRefs.current[idx] = el
              }}
              rows={1}
              value={item}
              onChange={(event) => updateItem(idx, event.target.value)}
              onKeyDown={(event) => handleKeyDown(event, idx)}
              placeholder={placeholder}
              className="font-serif resize-none bg-transparent border-0 border-b-[1.5px] border-dashed border-[var(--line)] px-1 py-2 text-[18px] leading-snug text-[var(--ink)] outline-none placeholder:text-[var(--ink-4)] focus:border-solid focus:border-[var(--clay)] [field-sizing:content]"
            />
            {visibleItems.length > 1 ? (
              <button
                type="button"
                onClick={() => removeItem(idx)}
                aria-label="Remove item"
                className="font-mono text-[16px] text-[var(--ink-4)] hover:text-[var(--rose)]"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="font-hand mt-2"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 22,
          color: "var(--clay)",
          padding: "6px 0",
        }}
      >
        {addLabel}
      </button>
    </div>
  )
}
