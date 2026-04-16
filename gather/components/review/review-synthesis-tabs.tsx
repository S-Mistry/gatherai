"use client"

import { CaretRight } from "@phosphor-icons/react"
import { Popover as RadixPopover } from "radix-ui"

import { Badge } from "@/components/ui/badge"
import type {
  InsightClaim,
  QualityScore,
  QuestionAnswer,
  SessionOutputGenerated,
  ThemeSummary,
} from "@/lib/domain/types"
import { cn } from "@/lib/utils"

import { EvidencePill } from "./evidence-pill"
import { ReviewOverrideForm } from "./review-override-form"

interface ReviewSynthesisTabsProps {
  projectId: string
  sessionId: string
  generatedStatus: "ready" | "pending" | "failed" | "idle"
  generatedOutput: SessionOutputGenerated
  effectiveSummary: string
  override?: { editedSummary: string; consultantNotes: string }
  qualityScore?: QualityScore
  qualityStatus: "ready" | "pending" | "failed" | "idle"
  analysisFailure?: string
}

export function ReviewSynthesisTabs(props: ReviewSynthesisTabsProps) {
  const {
    projectId,
    sessionId,
    generatedStatus,
    generatedOutput,
    effectiveSummary,
    override,
    qualityScore,
    qualityStatus,
    analysisFailure,
  } = props

  if (generatedStatus !== "ready") {
    return (
      <Notice
        title={generatedStatus === "failed" ? "Analysis failed" : "Analysis pending"}
        message={
          generatedStatus === "failed"
            ? (analysisFailure ??
              "Session extraction did not complete. Inspect the failed analysis job and retry dispatch.")
            : "Generated respondent analysis will appear here as soon as queued jobs finish."
        }
        tone={generatedStatus === "failed" ? "danger" : "warning"}
      />
    )
  }

  const overrideActive = Boolean(override?.editedSummary?.trim())

  const counts = {
    answers: generatedOutput.questionAnswers.length,
    themes: generatedOutput.themes.length,
    pain: generatedOutput.painPoints.length,
    opp: generatedOutput.opportunities.length,
    risks: generatedOutput.risks.length,
    quotes: generatedOutput.keyQuotes.length,
    unresolved: generatedOutput.unresolvedQuestions.length,
  }

  return (
    <div className="stack gap-6">
      <SummarySection
        effectiveSummary={effectiveSummary}
        overrideActive={overrideActive}
        qualityScore={qualityScore}
        qualityStatus={qualityStatus}
        analysisFailure={analysisFailure}
      />

      <div className="divider" />

      <OverrideDisclosure
        defaultOpen={overrideActive}
        projectId={projectId}
        sessionId={sessionId}
        defaultSummary={override?.editedSummary ?? ""}
        defaultNotes={override?.consultantNotes ?? ""}
        generatedSummary={generatedOutput.summary}
        overrideActive={overrideActive}
      />

      <div className="divider" />

      <Section title="Answers" count={counts.answers}>
        {counts.answers === 0 ? (
          <EmptyHint message="No structured answers were captured for this respondent." />
        ) : (
          <div className="stack gap-0">
            {generatedOutput.questionAnswers.map((answer, idx) => (
              <AnswerArticle
                key={answer.questionId}
                answer={answer}
                hasDivider={idx > 0}
              />
            ))}
          </div>
        )}
      </Section>

      <div className="divider" />

      <Section title="Themes" count={counts.themes}>
        {counts.themes === 0 ? (
          <EmptyHint message="No themes were generated for this respondent." />
        ) : (
          <div className="stack gap-0">
            {generatedOutput.themes.map((theme, idx) => (
              <ThemeArticle
                key={theme.id}
                theme={theme}
                hasDivider={idx > 0}
              />
            ))}
          </div>
        )}
      </Section>

      <div className="divider" />

      <Section title="Insights">
        <div className="stack gap-2">
          <ClaimGroup
            label="Pain points"
            count={counts.pain}
            claims={generatedOutput.painPoints}
            defaultOpen
            emptyMessage="No pain points were generated."
          />
          <ClaimGroup
            label="Opportunities"
            count={counts.opp}
            claims={generatedOutput.opportunities}
            emptyMessage="No opportunities were generated."
          />
          <ClaimGroup
            label="Risks"
            count={counts.risks}
            claims={generatedOutput.risks}
            emptyMessage="No risks were generated."
          />
          <ClaimGroup
            label="Key quotes"
            count={counts.quotes}
            claims={generatedOutput.keyQuotes}
            emptyMessage="No key quotes were extracted."
          />
          <ClaimGroup
            label="Unresolved questions"
            count={counts.unresolved}
            emptyMessage="No unresolved questions were flagged."
          >
            {counts.unresolved > 0 ? (
              <ul className="stack gap-2 pt-1">
                {generatedOutput.unresolvedQuestions.map((question) => (
                  <li
                    key={question}
                    className="text-sm leading-6 text-foreground"
                  >
                    {question}
                  </li>
                ))}
              </ul>
            ) : null}
          </ClaimGroup>
        </div>
      </Section>

      <div className="divider" />

      <QualityDetails
        qualityScore={qualityScore}
        qualityStatus={qualityStatus}
        analysisFailure={analysisFailure}
      />
    </div>
  )
}

function SummarySection({
  effectiveSummary,
  overrideActive,
  qualityScore,
  qualityStatus,
  analysisFailure,
}: {
  effectiveSummary: string
  overrideActive: boolean
  qualityScore?: QualityScore
  qualityStatus: "ready" | "pending" | "failed" | "idle"
  analysisFailure?: string
}) {
  return (
    <section className="stack gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Summary
        </h2>
        <QualityChip
          qualityScore={qualityScore}
          qualityStatus={qualityStatus}
          analysisFailure={analysisFailure}
        />
      </div>
      <p className="prose-reader">{effectiveSummary}</p>
      <p className="text-xs leading-5 text-muted-foreground">
        {overrideActive
          ? "This summary uses the consultant override and is what synthesis will consume."
          : "Generated respondent summary — feeds synthesis unless overridden."}
      </p>
    </section>
  )
}

function QualityChip({
  qualityScore,
  qualityStatus,
  analysisFailure,
}: {
  qualityScore?: QualityScore
  qualityStatus: "ready" | "pending" | "failed" | "idle"
  analysisFailure?: string
}) {
  const ready = Boolean(qualityScore)
  const overall = ready ? Math.round((qualityScore?.overall ?? 0) * 100) : null
  const lowQuality = qualityScore?.lowQuality ?? false
  const dotColor = !ready
    ? "bg-muted-foreground"
    : lowQuality
      ? "bg-amber-500"
      : "bg-emerald-500"
  const label = ready
    ? `Quality ${overall}%`
    : qualityStatus === "failed"
      ? "Quality failed"
      : "Quality pending"

  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>
        <button
          type="button"
          className="focus-ring chip gap-2 hover:border-primary/40"
          aria-label={`Quality ${label}`}
        >
          <span className={cn("size-1.5 rounded-full", dotColor)} />
          <span className="tabular-nums">{label}</span>
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          sideOffset={8}
          align="end"
          className={cn(
            "z-50 w-[300px] rounded-2xl border border-border/70 bg-popover/95 p-4 shadow-[0_18px_50px_-28px_rgba(23,30,55,0.4)] backdrop-blur",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          {ready && qualityScore ? (
            <div className="stack gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-3xl font-semibold tabular-nums">
                  {overall}
                  <span className="text-base text-muted-foreground">%</span>
                </p>
                <Badge variant={lowQuality ? "warning" : "success"}>
                  {lowQuality ? "Low quality" : "Healthy"}
                </Badge>
              </div>
              <dl className="divide-y divide-border/60">
                {qualityScore.dimensions.map((dimension) => (
                  <div
                    key={dimension.key}
                    className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 py-2"
                  >
                    <dt className="text-xs font-medium capitalize text-foreground">
                      {dimension.key.replaceAll("_", " ")}
                    </dt>
                    <dd className="text-xs font-semibold tabular-nums text-foreground">
                      {Math.round(dimension.score * 100)}%
                    </dd>
                    <p className="col-span-2 text-xs leading-5 text-muted-foreground">
                      {dimension.rationale}
                    </p>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">
              {qualityStatus === "failed"
                ? (analysisFailure ??
                  "Quality scoring did not complete. Retry dispatch or inspect the failed job.")
                : "Quality scoring will appear once analysis jobs finish."}
            </p>
          )}
          <RadixPopover.Arrow className="fill-popover/95" />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section className="stack gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {typeof count === "number" ? (
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            · {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function AnswerArticle({
  answer,
  hasDivider,
}: {
  answer: QuestionAnswer
  hasDivider: boolean
}) {
  return (
    <article className={cn("py-3", hasDivider && "border-t border-border/60")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">
          {answer.prompt}
        </h3>
        <Badge variant="neutral">
          {Math.round(answer.confidence * 100)}%
        </Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {answer.answer}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <EvidencePill evidence={answer.evidence} />
      </div>
    </article>
  )
}

function ThemeArticle({
  theme,
  hasDivider,
}: {
  theme: ThemeSummary
  hasDivider: boolean
}) {
  return (
    <article className={cn("py-3", hasDivider && "border-t border-border/60")}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">{theme.title}</h3>
        <Badge variant="neutral">{theme.frequency} hit(s)</Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {theme.summary}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <EvidencePill evidence={theme.evidence} />
      </div>
    </article>
  )
}

function ClaimGroup({
  label,
  count,
  claims,
  children,
  defaultOpen = false,
  emptyMessage,
}: {
  label: string
  count: number
  claims?: InsightClaim[]
  children?: React.ReactNode
  defaultOpen?: boolean
  emptyMessage: string
}) {
  return (
    <details
      className="group border-b border-border/60 py-3 last:border-b-0 [&_summary::-webkit-details-marker]:hidden"
      open={defaultOpen && count > 0}
    >
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-md py-1 text-sm font-semibold text-foreground outline-none">
        <span className="flex items-center gap-2">
          <CaretRight
            className="size-3.5 text-muted-foreground transition-transform group-open:rotate-90"
            weight="bold"
          />
          {label}
        </span>
        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
      </summary>
      <div className="stack gap-3 pt-3 pl-5">
        {count === 0 ? (
          <EmptyHint message={emptyMessage} />
        ) : children ? (
          children
        ) : (
          (claims ?? []).map((claim, idx) => (
            <div
              key={claim.id}
              className={cn(
                "stack gap-2",
                idx > 0 && "border-t border-border/50 pt-3"
              )}
            >
              <h4 className="text-sm font-semibold text-foreground">
                {claim.label}
              </h4>
              <p className="text-sm leading-6 text-muted-foreground">
                {claim.summary}
              </p>
              <div className="flex flex-wrap gap-2">
                <EvidencePill evidence={claim.evidence} />
              </div>
            </div>
          ))
        )}
      </div>
    </details>
  )
}

function OverrideDisclosure({
  defaultOpen,
  projectId,
  sessionId,
  defaultSummary,
  defaultNotes,
  generatedSummary,
  overrideActive,
}: {
  defaultOpen: boolean
  projectId: string
  sessionId: string
  defaultSummary: string
  defaultNotes: string
  generatedSummary: string
  overrideActive: boolean
}) {
  return (
    <details
      className="group [&_summary::-webkit-details-marker]:hidden"
      open={defaultOpen}
    >
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-md py-1 text-sm font-semibold text-foreground outline-none">
        <span className="flex items-center gap-2">
          <CaretRight
            className="size-3.5 text-muted-foreground transition-transform group-open:rotate-90"
            weight="bold"
          />
          Edit summary used in synthesis
        </span>
        {overrideActive ? (
          <span className="text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
            Active
          </span>
        ) : null}
      </summary>
      <div className="pt-4">
        <ReviewOverrideForm
          projectId={projectId}
          sessionId={sessionId}
          defaultSummary={defaultSummary}
          defaultNotes={defaultNotes}
          generatedSummary={generatedSummary}
          overrideActive={overrideActive}
        />
      </div>
    </details>
  )
}

function QualityDetails({
  qualityScore,
  qualityStatus,
  analysisFailure,
}: {
  qualityScore?: QualityScore
  qualityStatus: "ready" | "pending" | "failed" | "idle"
  analysisFailure?: string
}) {
  return (
    <details className="group [&_summary::-webkit-details-marker]:hidden">
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-md py-1 text-sm font-semibold text-foreground outline-none">
        <span className="flex items-center gap-2">
          <CaretRight
            className="size-3.5 text-muted-foreground transition-transform group-open:rotate-90"
            weight="bold"
          />
          Quality breakdown
        </span>
        {qualityScore ? (
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
            {Math.round(qualityScore.overall * 100)}%
          </span>
        ) : null}
      </summary>
      <div className="pt-4">
        {qualityScore ? (
          <div className="stack gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-4xl font-semibold tabular-nums tracking-tight">
                {Math.round(qualityScore.overall * 100)}
                <span className="text-xl text-muted-foreground">%</span>
              </p>
              <Badge variant={qualityScore.lowQuality ? "warning" : "success"}>
                {qualityScore.lowQuality ? "Low quality" : "Healthy"}
              </Badge>
            </div>
            <dl className="divide-y divide-border/60">
              {qualityScore.dimensions.map((dimension) => (
                <div
                  key={dimension.key}
                  className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3"
                >
                  <dt className="text-sm font-medium capitalize text-foreground">
                    {dimension.key.replaceAll("_", " ")}
                  </dt>
                  <dd className="text-sm font-semibold tabular-nums text-foreground">
                    {Math.round(dimension.score * 100)}%
                  </dd>
                  <p className="col-span-2 text-sm leading-6 text-muted-foreground">
                    {dimension.rationale}
                  </p>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <Notice
            title={qualityStatus === "failed" ? "Quality scoring failed" : "Quality pending"}
            message={
              qualityStatus === "failed"
                ? (analysisFailure ??
                  "Quality scoring did not complete. Retry dispatch or inspect the failed job.")
                : "Quality scoring will appear once analysis jobs finish."
            }
            tone={qualityStatus === "failed" ? "danger" : "warning"}
          />
        )}
      </div>
    </details>
  )
}

function EmptyHint({ message }: { message: string }) {
  return (
    <p className="text-sm leading-6 text-muted-foreground">{message}</p>
  )
}

function Notice({
  title,
  message,
  tone,
}: {
  title: string
  message: string
  tone: "neutral" | "warning" | "danger"
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 p-5">
      <Badge variant={tone}>{title}</Badge>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
    </div>
  )
}
