import { notFound } from "next/navigation"

import { ConsultantAppBar } from "@/components/dashboard/consultant-app-bar"
import { ReviewEvidenceDrawer } from "@/components/review/review-evidence-drawer"
import { ReviewSelectionProvider } from "@/components/review/review-selection-context"
import { ReviewSiblingRail } from "@/components/review/review-sibling-rail"
import { ReviewStatusControls } from "@/components/review/review-status-controls"
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

  const transcriptEmpty = (
    <TranscriptEmptyState
      status={review.transcriptStatus}
      failureMessage={review.analysisFailure}
    />
  )

  const headerBadges: Array<{
    variant: "clay" | "gold" | "rose"
    label: string
  }> = []
  if (review.session.excludedFromSynthesis)
    headerBadges.push({ variant: "rose", label: "Excluded" })

  return (
    <ReviewSelectionProvider>
      <ConsultantAppBar
        crumb={[
          { label: "Workspace", href: "/app" },
          { label: review.project.name, href: `/app/projects/${projectId}` },
          { label: review.session.respondentLabel },
        ]}
        rightSlot={
          <ReviewStatusControls
            projectId={projectId}
            sessionId={sessionId}
            excludedFromSynthesis={review.session.excludedFromSynthesis}
            statuses={[
              { label: "Transcript", status: review.transcriptStatus },
              { label: "Analysis", status: review.generatedStatus },
              { label: "Quality", status: review.qualityStatus },
            ]}
          />
        }
      />

      <div
        style={{
          padding: "32px 40px 80px",
          maxWidth: 1320,
          margin: "0 auto",
        }}
      >
        {headerBadges.length > 0 ? (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {headerBadges.map((badge) => (
              <Badge key={badge.label} variant={badge.variant}>
                {badge.label}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex min-w-0 gap-5">
          <aside
            className="hidden shrink-0 lg:block lg:self-start"
            style={{
              position: "sticky",
              top: "calc(var(--app-bar-height) + 24px)",
            }}
          >
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
              projectType={review.project.projectType}
              generatedStatus={review.generatedStatus}
              generatedOutput={review.generatedOutput}
              qualityScore={review.qualityScore}
              qualityStatus={review.qualityStatus}
              analysisFailure={review.analysisFailure}
            />
          </section>

          <aside
            className="hidden xl:block xl:w-[clamp(280px,24vw,340px)] xl:shrink-0 xl:self-start"
            style={{
              position: "sticky",
              top: "calc(var(--app-bar-height) + 24px)",
            }}
          >
            <div
              className="flex flex-col gap-3"
              style={{
                maxHeight: "calc(100vh - var(--app-bar-height) - 48px)",
              }}
            >
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="eyebrow">Transcript</span>
                <span className="text-[10px] tracking-[0.18em] text-[var(--ink-3)] uppercase">
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
    <div className="card flat" style={{ padding: "16px 20px" }}>
      <Badge variant={tone}>{title}</Badge>
      <p className="m-0 mt-2 font-sans text-sm leading-6 text-[var(--ink-2)]">
        {message}
      </p>
    </div>
  )
}
