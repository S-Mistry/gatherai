import { notFound } from "next/navigation"

import {
  saveSessionOverrideAction,
  toggleSessionExclusionAction,
} from "@/app/app/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Badge variant="accent">Session review</Badge>
          <div>
            <h1 className="text-4xl font-semibold">{review.session.respondentLabel}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Review transcript evidence, quality signals, and consultant overrides before allowing
              this interview to shape synthesis.
            </p>
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
            {review.session.excludedFromSynthesis ? "Include in synthesis" : "Exclude from synthesis"}
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
            {review.transcript.map((segment) => (
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
                  <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    {segment.id}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-foreground">{segment.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardDescription>Generated outputs</CardDescription>
              <CardTitle>Major claims and evidence refs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {review.generatedOutput.themes.map((theme) => (
                <div
                  key={theme.id}
                  className="rounded-2xl border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">{theme.title}</h2>
                    <Badge variant="neutral">{theme.frequency} hit(s)</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {theme.summary}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {theme.evidence.map((evidence) => (
                      <li key={`${evidence.sessionId}-${evidence.segmentIds.join("-")}`}>
                        {evidence.segmentIds.join(", ")} • {evidence.rationale}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Consultant override</CardDescription>
              <CardTitle>Editable summary layer</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={saveSessionOverrideAction} className="space-y-4">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="sessionId" value={sessionId} />

                <div className="space-y-2">
                  <label htmlFor="editedSummary" className="text-sm font-medium">
                    Edited summary
                  </label>
                  <Textarea
                    id="editedSummary"
                    name="editedSummary"
                    defaultValue={review.override?.editedSummary ?? review.generatedOutput.cleanedTranscript}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="consultantNotes" className="text-sm font-medium">
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
