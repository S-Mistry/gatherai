import { notFound } from "next/navigation"

import {
  saveSessionOverrideAction,
  toggleSessionExclusionAction,
} from "@/app/app/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type {
  EvidenceRef,
  InsightClaim,
  QuestionAnswer,
  QualityScore,
  ThemeSummary,
} from "@/lib/domain/types"
import { getSessionReview } from "@/lib/data/repository"

interface SessionReviewPageProps {
  params: Promise<{
    projectId: string
    sessionId: string
  }>
}

function statusVariant(status: string) {
  if (status === "ready") {
    return "success"
  }

  if (status === "pending") {
    return "warning"
  }

  if (status === "failed") {
    return "danger"
  }

  return "neutral"
}

function statusLabel(status: string) {
  switch (status) {
    case "ready":
      return "Ready"
    case "pending":
      return "Pending"
    case "failed":
      return "Failed"
    case "empty":
      return "Empty"
    default:
      return "Idle"
  }
}

function StateNotice({
  title,
  message,
  variant,
}: {
  title: string
  message: string
  variant: "neutral" | "warning" | "danger"
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
      <div className="flex items-center gap-3">
        <Badge variant={variant}>{title}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
    </div>
  )
}

function EvidenceList({ evidence }: { evidence: EvidenceRef[] }) {
  if (evidence.length === 0) {
    return (
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
        No evidence refs yet
      </p>
    )
  }

  return (
    <ul className="space-y-1 text-xs tracking-[0.2em] text-muted-foreground uppercase">
      {evidence.map((ref) => (
        <li
          key={`${ref.sessionId}-${ref.segmentIds.join("-")}-${ref.rationale}`}
        >
          {ref.segmentIds.join(", ")} • {ref.rationale}
        </li>
      ))}
    </ul>
  )
}

function QuestionAnswerList({ answers }: { answers: QuestionAnswer[] }) {
  return (
    <div className="space-y-3">
      {answers.map((answer) => (
        <div
          key={answer.questionId}
          className="rounded-2xl border border-border/70 bg-background/70 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">
              {answer.prompt}
            </h3>
            <Badge variant="neutral">
              {Math.round(answer.confidence * 100)}%
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {answer.answer}
          </p>
          <div className="mt-3">
            <EvidenceList evidence={answer.evidence} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ThemeList({ themes }: { themes: ThemeSummary[] }) {
  return (
    <div className="space-y-3">
      {themes.map((theme) => (
        <div
          key={theme.id}
          className="rounded-2xl border border-border/70 bg-background/70 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">
              {theme.title}
            </h3>
            <Badge variant="neutral">{theme.frequency} hit(s)</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {theme.summary}
          </p>
          <div className="mt-3">
            <EvidenceList evidence={theme.evidence} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ClaimList({
  claims,
  emptyMessage,
}: {
  claims: InsightClaim[]
  emptyMessage: string
}) {
  if (claims.length === 0) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">{emptyMessage}</p>
    )
  }

  return (
    <div className="space-y-3">
      {claims.map((claim) => (
        <div
          key={claim.id}
          className="rounded-2xl border border-border/70 bg-background/70 p-4"
        >
          <h3 className="text-base font-semibold text-foreground">
            {claim.label}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {claim.summary}
          </p>
          <div className="mt-3">
            <EvidenceList evidence={claim.evidence} />
          </div>
        </div>
      ))}
    </div>
  )
}

function QualityCard({
  qualityScore,
  qualityStatus,
  analysisFailure,
}: {
  qualityScore?: QualityScore
  qualityStatus: string
  analysisFailure?: string
}) {
  if (!qualityScore) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Quality signals</CardDescription>
          <CardTitle>Interview quality</CardTitle>
        </CardHeader>
        <CardContent>
          {qualityStatus === "failed" ? (
            <StateNotice
              title="Analysis failed"
              message={
                analysisFailure ??
                "Quality scoring did not complete. Retry dispatch or inspect the failed analysis job."
              }
              variant="danger"
            />
          ) : (
            <StateNotice
              title="Analysis pending"
              message="Quality scoring will appear as soon as queued analysis jobs finish."
              variant="warning"
            />
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Quality signals</CardDescription>
        <CardTitle>Interview quality</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Overall score</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Low-quality flag: {qualityScore.lowQuality ? "On" : "Off"}
            </p>
          </div>
          <Badge variant={qualityScore.lowQuality ? "warning" : "success"}>
            {Math.round(qualityScore.overall * 100)}%
          </Badge>
        </div>

        {qualityScore.dimensions.map((dimension) => (
          <div
            key={dimension.key}
            className="rounded-2xl border border-border/70 bg-background/70 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold tracking-[0.24em] text-muted-foreground uppercase">
                {dimension.key.replaceAll("_", " ")}
              </h3>
              <Badge variant="neutral">
                {Math.round(dimension.score * 100)}%
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {dimension.rationale}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default async function SessionReviewPage({
  params,
}: SessionReviewPageProps) {
  const { projectId, sessionId } = await params
  const review = await getSessionReview(projectId, sessionId)

  if (!review) {
    notFound()
  }

  const overrideActive = Boolean(review.override?.editedSummary.trim())

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Badge variant="accent">Session review</Badge>
          <div>
            <h1 className="text-4xl font-semibold">
              {review.session.respondentLabel}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Review transcript evidence, generated analysis, quality signals,
              and consultant overrides before allowing this interview to shape
              synthesis.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant(review.transcriptStatus)}>
              Transcript {statusLabel(review.transcriptStatus)}
            </Badge>
            <Badge variant={statusVariant(review.generatedStatus)}>
              Analysis {statusLabel(review.generatedStatus)}
            </Badge>
            <Badge variant={statusVariant(review.qualityStatus)}>
              Quality {statusLabel(review.qualityStatus)}
            </Badge>
            {overrideActive ? (
              <Badge variant="accent">Override active</Badge>
            ) : null}
          </div>
        </div>
        <form action={toggleSessionExclusionAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="sessionId" value={sessionId} />
          <input
            type="hidden"
            name="excluded"
            value={review.session.excludedFromSynthesis ? "false" : "true"}
          />
          <Button type="submit" variant="secondary">
            {review.session.excludedFromSynthesis
              ? "Include in synthesis"
              : "Exclude from synthesis"}
          </Button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <CardDescription>Transcript</CardDescription>
            <CardTitle>Evidence timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {review.transcript.length > 0 ? (
              review.transcript.map((segment) => (
                <div
                  key={segment.id}
                  className="rounded-2xl border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge
                      variant={
                        segment.speaker === "participant"
                          ? "accent"
                          : segment.speaker === "agent"
                            ? "neutral"
                            : "warning"
                      }
                    >
                      {segment.speaker}
                    </Badge>
                    <span className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
                      {segment.sourceItemId ?? segment.id}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground">
                    {segment.text}
                  </p>
                </div>
              ))
            ) : review.transcriptStatus === "pending" ? (
              <StateNotice
                title="Transcript pending"
                message="Transcript items are still being persisted or analysis jobs are still running. Refresh in a moment."
                variant="warning"
              />
            ) : review.transcriptStatus === "failed" ? (
              <StateNotice
                title="Transcript failed"
                message={
                  review.analysisFailure ??
                  "Transcript-backed analysis did not complete. Inspect the failed analysis job and retry dispatch."
                }
                variant="danger"
              />
            ) : (
              <StateNotice
                title="Transcript empty"
                message="This completed session does not have any persisted transcript segments yet."
                variant="neutral"
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardDescription>Per-respondent analysis</CardDescription>
              <CardTitle>Generated summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {review.generatedStatus === "ready" ? (
                <>
                  <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="success">Analysis ready</Badge>
                      {overrideActive ? (
                        <Badge variant="accent">Override applied</Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-base leading-7 text-foreground">
                      {review.effectiveOutput.summary}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {overrideActive
                        ? "This summary currently uses the consultant override and is what project synthesis will consume."
                        : "This is the generated respondent summary that will feed project synthesis unless you override it below."}
                    </p>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardDescription>Structured answers</CardDescription>
                        <CardTitle>Question-by-question answers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <QuestionAnswerList
                          answers={review.generatedOutput.questionAnswers}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardDescription>Generated outputs</CardDescription>
                        <CardTitle>Themes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {review.generatedOutput.themes.length > 0 ? (
                          <ThemeList themes={review.generatedOutput.themes} />
                        ) : (
                          <p className="text-sm leading-6 text-muted-foreground">
                            No themes were generated for this respondent yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardDescription>Generated outputs</CardDescription>
                        <CardTitle>Pain points</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ClaimList
                          claims={review.generatedOutput.painPoints}
                          emptyMessage="No pain points were generated for this respondent yet."
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardDescription>Generated outputs</CardDescription>
                        <CardTitle>Opportunities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ClaimList
                          claims={review.generatedOutput.opportunities}
                          emptyMessage="No opportunities were generated for this respondent yet."
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardDescription>Generated outputs</CardDescription>
                        <CardTitle>Risks</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ClaimList
                          claims={review.generatedOutput.risks}
                          emptyMessage="No risks were generated for this respondent yet."
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardDescription>Generated outputs</CardDescription>
                        <CardTitle>Key quotes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ClaimList
                          claims={review.generatedOutput.keyQuotes}
                          emptyMessage="No key quotes were extracted for this respondent yet."
                        />
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardDescription>Open threads</CardDescription>
                      <CardTitle>Unresolved questions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {review.generatedOutput.unresolvedQuestions.length > 0 ? (
                        <div className="space-y-3">
                          {review.generatedOutput.unresolvedQuestions.map(
                            (question) => (
                              <div
                                key={question}
                                className="rounded-2xl border border-border/70 bg-background/70 p-4"
                              >
                                <p className="text-sm leading-6 text-foreground">
                                  {question}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-sm leading-6 text-muted-foreground">
                          No unresolved questions were flagged for this
                          respondent.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : review.generatedStatus === "failed" ? (
                <StateNotice
                  title="Analysis failed"
                  message={
                    review.analysisFailure ??
                    "Session extraction did not complete. Inspect the failed analysis job and retry dispatch."
                  }
                  variant="danger"
                />
              ) : (
                <StateNotice
                  title="Analysis pending"
                  message="Generated respondent analysis will appear here as soon as queued jobs finish."
                  variant="warning"
                />
              )}
            </CardContent>
          </Card>

          <QualityCard
            qualityScore={review.qualityScore}
            qualityStatus={review.qualityStatus}
            analysisFailure={review.analysisFailure}
          />

          <Card>
            <CardHeader>
              <CardDescription>Consultant override</CardDescription>
              <CardTitle>Consultant summary override</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={saveSessionOverrideAction} className="space-y-4">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="sessionId" value={sessionId} />

                <p className="text-sm leading-6 text-muted-foreground">
                  Use this field to replace the generated respondent summary
                  that project synthesis will consume. Raw transcript evidence
                  and generated artifacts remain unchanged.
                </p>

                <div className="space-y-2">
                  <label
                    htmlFor="editedSummary"
                    className="text-sm font-medium"
                  >
                    Summary used in synthesis
                  </label>
                  <Textarea
                    id="editedSummary"
                    name="editedSummary"
                    defaultValue={
                      review.override?.editedSummary ??
                      review.generatedOutput.summary
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="consultantNotes"
                    className="text-sm font-medium"
                  >
                    Consultant notes
                  </label>
                  <Textarea
                    id="consultantNotes"
                    name="consultantNotes"
                    defaultValue={review.override?.consultantNotes ?? ""}
                  />
                </div>

                <Button type="submit">Save override</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
