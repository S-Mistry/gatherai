"use client"

import { Popover as RadixPopover } from "radix-ui"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type {
  InsightCard,
  ProjectType,
  QualityScore,
  QuestionReview,
  QuoteLibraryItem,
  SessionOutputGenerated,
} from "@/lib/domain/types"
import { getProjectTypePreset } from "@/lib/project-types"
import { cn } from "@/lib/utils"

import { EvidencePill } from "./evidence-pill"
import { ReviewTranscriptDrawerButton } from "./review-transcript-drawer-button"

interface ReviewSynthesisTabsProps {
  projectType: ProjectType
  generatedStatus: "ready" | "pending" | "failed" | "idle"
  generatedOutput: SessionOutputGenerated
  qualityScore?: QualityScore
  qualityStatus: "ready" | "pending" | "failed" | "idle"
  analysisFailure?: string
}

export function ReviewSynthesisTabs({
  projectType,
  generatedStatus,
  generatedOutput,
  qualityScore,
  qualityStatus,
  analysisFailure,
}: ReviewSynthesisTabsProps) {
  if (generatedStatus !== "ready") {
    return (
      <Notice
        title={
          generatedStatus === "failed" ? "Analysis failed" : "Analysis pending"
        }
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

  const themeCards = generatedOutput.insightCards.filter(
    (card) => card.kind === "theme"
  )
  const signalCards = generatedOutput.insightCards.filter(
    (card) => card.kind !== "theme"
  )
  const preset = getProjectTypePreset(projectType)

  return (
    <Tabs defaultValue="overview" className="min-w-0 gap-5">
      <TabsList>
        <TabsTrigger value="overview">
          Overview
          <CountChip count={countFilledSections(generatedOutput)} />
        </TabsTrigger>
        <TabsTrigger value="questions">
          Questions
          <CountChip count={generatedOutput.questionReviews.length} />
        </TabsTrigger>
        <TabsTrigger value="themes">
          Themes
          <CountChip count={themeCards.length} />
        </TabsTrigger>
        <TabsTrigger value="quotes">
          Quote library
          <CountChip count={generatedOutput.quoteLibrary.length} />
        </TabsTrigger>
        <TabsTrigger value="signals">
          Signals
          <CountChip count={signalCards.length} />
        </TabsTrigger>
        <TabsTrigger value="transcript">Transcript</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="flex flex-col gap-6">
        <SummarySection
          generatedOutput={generatedOutput}
          qualityScore={qualityScore}
          qualityStatus={qualityStatus}
          analysisFailure={analysisFailure}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <ListPanel
            title={preset.implicationsLabel}
            items={generatedOutput.projectImplications}
            emptyMessage={preset.implicationsEmptyMessage}
          />
          <ListPanel
            title="Recommended actions"
            items={generatedOutput.recommendedActions}
            emptyMessage="No follow-on actions were suggested yet."
          />
          <ListPanel
            title="Unresolved questions"
            items={generatedOutput.unresolvedQuestions}
            emptyMessage="No unresolved questions were flagged."
          />
          <ListPanel
            title="Analysis warnings"
            items={generatedOutput.analysisWarnings}
            emptyMessage="No analysis warnings were raised."
            tone="warning"
          />
        </div>

        <RespondentProfilePanel profile={generatedOutput.respondentProfile} />
      </TabsContent>

      <TabsContent value="questions" className="flex flex-col gap-3">
        {generatedOutput.questionReviews.length === 0 ? (
          <EmptyHint message="No question-level review was generated for this session." />
        ) : (
          generatedOutput.questionReviews.map((review) => (
            <QuestionReviewCard key={review.questionId} review={review} />
          ))
        )}
      </TabsContent>

      <TabsContent value="themes" className="flex flex-col gap-3">
        {themeCards.length === 0 ? (
          <EmptyHint message="No grounded themes were extracted for this respondent yet." />
        ) : (
          themeCards.map((card) => (
            <InsightCardPanel key={card.id} card={card} />
          ))
        )}
      </TabsContent>

      <TabsContent value="quotes" className="flex flex-col gap-3">
        {generatedOutput.quoteLibrary.length === 0 ? (
          <EmptyHint message="No verbatim quote library was extracted for this respondent." />
        ) : (
          generatedOutput.quoteLibrary.map((quote) => (
            <QuoteLibraryCard key={quote.id} quote={quote} />
          ))
        )}
      </TabsContent>

      <TabsContent value="signals" className="flex flex-col gap-4">
        <SignalGroup
          title="Pain points"
          cards={signalCards.filter((card) => card.kind === "pain_point")}
          emptyMessage="No grounded pain points were extracted."
        />
        <SignalGroup
          title="Opportunities"
          cards={signalCards.filter((card) => card.kind === "opportunity")}
          emptyMessage="No grounded opportunities were extracted."
        />
        <SignalGroup
          title="Risks"
          cards={signalCards.filter((card) => card.kind === "risk")}
          emptyMessage="No grounded risks were extracted."
        />
        <SignalGroup
          title="Tensions"
          cards={signalCards.filter((card) => card.kind === "tension")}
          emptyMessage="No grounded tensions were extracted."
        />
      </TabsContent>

      <TabsContent value="transcript">
        <TranscriptTabPanel
          segmentCount={generatedOutput.cleanedTranscript.length}
        />
      </TabsContent>
    </Tabs>
  )
}

function CountChip({ count }: { count: number }) {
  return (
    <span className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">
      {count}
    </span>
  )
}

function countFilledSections(output: SessionOutputGenerated) {
  return [
    output.projectImplications.length > 0,
    output.recommendedActions.length > 0,
    output.unresolvedQuestions.length > 0,
    output.analysisWarnings.length > 0,
  ].filter(Boolean).length
}

function summarizeQuestionCoverage(questionReviews: QuestionReview[]) {
  return questionReviews.reduce(
    (summary, review) => {
      if (review.status === "answered") {
        summary.answered += 1
      } else if (review.status === "partial") {
        summary.partial += 1
      } else {
        summary.missing += 1
      }

      return summary
    },
    { answered: 0, partial: 0, missing: 0 }
  )
}

function deriveEvidenceHealthMessage({
  output,
  qualityScore,
}: {
  output: SessionOutputGenerated
  qualityScore?: QualityScore
}) {
  const specificity = qualityScore?.dimensions.find(
    (dimension) => dimension.key === "answer_specificity"
  )
  const coverage = qualityScore?.dimensions.find(
    (dimension) => dimension.key === "question_coverage"
  )

  if (
    output.analysisWarnings.length > 0 &&
    specificity &&
    specificity.score < 0.45
  ) {
    return "Low confidence here comes from limited concrete transcript detail, not from an analysis pipeline failure."
  }

  if (coverage && coverage.score < 0.5) {
    return "Several required questions are still thin or unanswered, so this summary should be treated as directional."
  }

  if (output.analysisWarnings.length > 0) {
    return "The analysis surfaced evidence-quality warnings that are worth checking before using this session in synthesis."
  }

  return null
}

function SummarySection({
  generatedOutput,
  qualityScore,
  qualityStatus,
  analysisFailure,
}: {
  generatedOutput: SessionOutputGenerated
  qualityScore?: QualityScore
  qualityStatus: "ready" | "pending" | "failed" | "idle"
  analysisFailure?: string
}) {
  const coverage = summarizeQuestionCoverage(generatedOutput.questionReviews)
  const evidenceHealthMessage = deriveEvidenceHealthMessage({
    output: generatedOutput,
    qualityScore,
  })

  return (
    <section className="rounded-3xl border border-border/70 bg-background/65 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Executive summary
            </h2>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {generatedOutput.summary}
          </p>
        </div>
        <QualityChip
          qualityScore={qualityScore}
          qualityStatus={qualityStatus}
          analysisFailure={analysisFailure}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1">
          Confidence {Math.round(generatedOutput.confidenceScore * 100)}%
        </span>
        <span className="rounded-full border border-[var(--sage)] bg-[var(--sage-soft)] px-3 py-1 text-[var(--sage)]">
          Answered {coverage.answered}
        </span>
        <span className="rounded-full border border-[var(--gold)] bg-[var(--gold-soft)] px-3 py-1 text-[var(--gold)]">
          Partial {coverage.partial}
        </span>
        <span className="rounded-full border border-[var(--rose)] bg-[var(--rose-soft)] px-3 py-1 text-[var(--rose)]">
          Missing {coverage.missing}
        </span>
        <span className="max-w-full rounded-full border border-border/70 bg-background/80 px-3 py-1 break-all">
          Model {generatedOutput.modelVersionId}
        </span>
        <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1">
          Generated {new Date(generatedOutput.createdAt).toLocaleString()}
        </span>
      </div>

      {evidenceHealthMessage ? (
        <p className="mt-4 rounded-2xl border border-[var(--gold)] bg-[var(--gold-soft)] px-4 py-3 text-sm leading-6 text-foreground">
          <span className="font-semibold">Evidence health:</span>{" "}
          {evidenceHealthMessage}
        </p>
      ) : null}
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
      ? "bg-[var(--gold)]"
      : "bg-[var(--sage)]"
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
          className="chip gap-2 hover:border-primary/40"
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
            "z-50 w-[320px] rounded-2xl border border-border/70 bg-[var(--card)] p-4 shadow-[var(--shadow-pop)] backdrop-blur",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          {ready && qualityScore ? (
            <div className="flex flex-col gap-3">
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
                    <dt className="text-xs font-medium text-foreground capitalize">
                      {dimension.key.replaceAll("_", " ")}
                    </dt>
                    <dd className="text-xs font-semibold text-foreground tabular-nums">
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

function ListPanel({
  title,
  items,
  emptyMessage,
  tone = "neutral",
}: {
  title: string
  items: string[]
  emptyMessage: string
  tone?: "neutral" | "warning"
}) {
  return (
    <section className="rounded-3xl border border-border/70 bg-background/60 p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {tone === "warning" && items.length > 0 ? (
          <Badge variant="warning">Attention</Badge>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-foreground marker:text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RespondentProfilePanel({
  profile,
}: {
  profile: Record<string, string>
}) {
  const entries = Object.entries(profile).filter(
    ([, value]) => value.trim().length > 0
  )

  if (entries.length === 0) {
    return null
  }

  return (
    <section className="rounded-3xl border border-border/70 bg-background/60 p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Respondent profile
      </h3>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="rounded-2xl border border-border/60 bg-background/70 p-4"
          >
            <dt className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              {key.replaceAll("_", " ")}
            </dt>
            <dd className="mt-2 text-sm leading-6 text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function QuestionReviewCard({ review }: { review: QuestionReview }) {
  return (
    <article className="rounded-3xl border border-border/70 bg-background/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                review.status === "answered"
                  ? "success"
                  : review.status === "partial"
                    ? "warning"
                    : "danger"
              }
            >
              {review.status}
            </Badge>
            <span className="text-sm font-semibold text-foreground">
              {review.prompt}
            </span>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {review.answer}
          </p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
          {Math.round(review.confidence * 100)}%
        </span>
      </div>

      {review.keyPoints.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Key points
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-foreground marker:text-muted-foreground">
            {review.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <QuoteExcerptList quotes={review.evidenceQuotes} className="mt-4" />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <EvidencePill evidence={review.evidence} />
        {review.followUpQuestions.length > 0 ? (
          <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            {review.followUpQuestions.length} follow-up
            {review.followUpQuestions.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {review.followUpQuestions.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-border/60 bg-background/70 p-4">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Missing follow-up
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-foreground">
            {review.followUpQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  )
}

function QuoteLibraryCard({ quote }: { quote: QuoteLibraryItem }) {
  return (
    <article className="rounded-3xl border border-border/70 bg-background/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">{quote.label}</Badge>
          </div>
          <blockquote className="rounded-2xl border border-[var(--clay-soft)] bg-[var(--clay-soft)] px-4 py-3 text-sm leading-6 text-foreground">
            “{quote.excerpt}”
          </blockquote>
          <p className="text-sm leading-6 text-muted-foreground">
            {quote.context}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <EvidencePill evidence={quote.evidence} />
        {quote.questionIds.map((questionId) => (
          <span
            key={questionId}
            className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
          >
            {questionId}
          </span>
        ))}
        {quote.themeHints.map((hint) => (
          <span
            key={hint}
            className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
          >
            {hint}
          </span>
        ))}
      </div>
    </article>
  )
}

function SignalGroup({
  title,
  cards,
  emptyMessage,
}: {
  title: string
  cards: InsightCard[]
  emptyMessage: string
}) {
  return (
    <section className="rounded-3xl border border-border/70 bg-background/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
          {cards.length}
        </span>
      </div>
      {cards.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {cards.map((card) => (
            <InsightCardPanel key={card.id} card={card} />
          ))}
        </div>
      )}
    </section>
  )
}

function InsightCardPanel({ card }: { card: InsightCard }) {
  return (
    <article className="rounded-2xl border border-border/60 bg-background/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                card.priority === "high"
                  ? "warning"
                  : card.priority === "medium"
                    ? "accent"
                    : "neutral"
              }
            >
              {card.priority}
            </Badge>
            <h4 className="text-sm font-semibold text-foreground">
              {card.title}
            </h4>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {card.summary}
          </p>
        </div>
      </div>

      <QuoteExcerptList quotes={card.evidenceQuotes} className="mt-4" />

      <div className="mt-4 flex flex-wrap gap-2">
        <EvidencePill evidence={card.evidence} />
      </div>
    </article>
  )
}

function QuoteExcerptList({
  quotes,
  className,
}: {
  quotes: string[]
  className?: string
}) {
  if (quotes.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        Grounding quotes
      </p>
      <ul className="space-y-2">
        {quotes.map((quote) => (
          <li
            key={quote}
            className="rounded-2xl border border-border/60 bg-background/75 px-4 py-3 text-sm leading-6 text-foreground"
          >
            “{quote}”
          </li>
        ))}
      </ul>
    </div>
  )
}

function TranscriptTabPanel({ segmentCount }: { segmentCount: number }) {
  return (
    <section className="rounded-3xl border border-border/70 bg-background/60 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="accent">Transcript rail</Badge>
        <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Open for full context
        </span>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Evidence links in this review jump directly into the transcript rail on
        desktop and open the transcript drawer on smaller screens. Use the full
        transcript when you want to read past the excerpted evidence.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ReviewTranscriptDrawerButton />
        <span className="text-xs text-muted-foreground">
          Generated transcript text length: {segmentCount} characters
        </span>
      </div>
    </section>
  )
}

function EmptyHint({ message }: { message: string }) {
  return <p className="text-sm leading-6 text-muted-foreground">{message}</p>
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
