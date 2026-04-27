import { notFound } from "next/navigation"

import { ReviewActionBar } from "@/components/review/review-action-bar"
import { ReviewEvidenceDrawer } from "@/components/review/review-evidence-drawer"
import { ReviewSelectionProvider } from "@/components/review/review-selection-context"
import { ReviewSiblingRail } from "@/components/review/review-sibling-rail"
import { ReviewSynthesisTabs } from "@/components/review/review-synthesis-tabs"
import { ReviewTranscriptPane } from "@/components/review/review-transcript-pane"
import { Badge } from "@/components/ui/badge"
import { getSessionReview } from "@/lib/data/repository"

interface SessionReviewPageProps {
  params: Promise<{
    projectId: string
    sessionId: string
  }>
}

export default async function SessionReviewPage({
  params,
}: SessionReviewPageProps) {
  const { projectId, sessionId } = await params
  const review = await getSessionReview(projectId, sessionId)

  if (!review) {
    notFound()
  }

  const overrideActive = Boolean(review.override?.editedSummary?.trim())
  const transcriptEmpty = (
    <TranscriptEmptyState
      status={review.transcriptStatus}
      failureMessage={review.analysisFailure}
    />
  )

  return (
    <ReviewSelectionProvider>
      <div className="-mt-6 flex flex-col">
        <ReviewActionBar
          projectId={projectId}
          projectName={review.project.name}
          sessionId={sessionId}
          respondentLabel={review.session.respondentLabel}
          excludedFromSynthesis={review.session.excludedFromSynthesis}
          overrideActive={overrideActive}
          qualityOverrideActive={Boolean(review.qualityOverride)}
          statuses={[
            { label: "Transcript", status: review.transcriptStatus },
            { label: "Analysis", status: review.generatedStatus },
            { label: "Quality", status: review.qualityStatus },
          ]}
        />

        <div className="flex gap-5 pt-6">
          <aside className="hidden shrink-0 lg:sticky lg:top-32 lg:block lg:self-start">
            <ReviewSiblingRail
              variant="compact"
              projectId={projectId}
              currentSessionId={sessionId}
              sessions={review.siblingSessions}
              qualityScores={review.siblingQualityScores}
            />
          </aside>

          <section className="min-w-0 flex-1">
            <ReviewSynthesisTabs
              projectId={projectId}
              sessionId={sessionId}
              projectType={review.project.projectType}
              generatedStatus={review.generatedStatus}
              generatedOutput={review.generatedOutput}
              effectiveOutput={review.effectiveOutput}
              override={review.override}
              qualityScore={review.qualityScore}
              qualityStatus={review.qualityStatus}
              qualityOverride={review.qualityOverride}
              analysisFailure={review.analysisFailure}
            />
          </section>

          <aside className="hidden xl:sticky xl:top-32 xl:block xl:w-[340px] xl:shrink-0 xl:self-start">
            <div className="flex max-h-[calc(100vh-9rem)] flex-col gap-3">
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="eyebrow">Transcript</span>
                <span className="text-[10px] tracking-[0.18em] text-muted-foreground/80 uppercase">
                  {review.transcript.length} segments
                </span>
              </div>
              <div className="flex-1 overflow-y-auto pr-1">
                <ReviewTranscriptPane
                  segments={review.transcript}
                  emptyState={transcriptEmpty}
                />
              </div>
            </div>
          </aside>
        </div>

        <ReviewEvidenceDrawer
          respondentLabel={review.session.respondentLabel}
          segments={review.transcript}
          emptyState={transcriptEmpty}
        />
      </div>
    </ReviewSelectionProvider>
  )
}

function TranscriptEmptyState({
  status,
  failureMessage,
}: {
  status: "ready" | "pending" | "failed" | "empty"
  failureMessage?: string
}) {
  if (status === "pending") {
    return (
      <NoticeCard
        title="Transcript pending"
        message="Transcript items are still being persisted or analysis jobs are still running. Refresh in a moment."
        tone="warning"
      />
    )
  }
  if (status === "failed") {
    return (
      <NoticeCard
        title="Transcript failed"
        message={
          failureMessage ??
          "Transcript-backed analysis did not complete. Inspect the failed analysis job and retry dispatch."
        }
        tone="danger"
      />
    )
  }
  return (
    <NoticeCard
      title="Transcript empty"
      message="This completed session does not have any persisted transcript segments yet."
      tone="neutral"
    />
  )
}

function NoticeCard({
  title,
  message,
  tone,
}: {
  title: string
  message: string
  tone: "neutral" | "warning" | "danger"
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <Badge variant={tone}>{title}</Badge>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
    </div>
  )
}
