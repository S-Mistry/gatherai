import Link from "next/link"
import { notFound } from "next/navigation"

import { refreshSynthesisAction, toggleSessionExclusionAction } from "@/app/app/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getProjectDetail } from "@/lib/data/mock"

interface ProjectDetailPageProps {
  params: Promise<{
    projectId: string
  }>
}

function statusVariant(status: string) {
  if (status === "complete") {
    return "success" as const
  }

  if (status === "abandoned") {
    return "danger" as const
  }

  if (status === "in_progress") {
    return "accent" as const
  }

  return "neutral" as const
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { projectId } = await params
  const detail = getProjectDetail(projectId)

  if (!detail) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <section className="panel space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge variant="accent">{detail.project.clientName}</Badge>
            <div>
              <h1 className="text-4xl font-semibold text-balance">{detail.project.name}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                {detail.configVersion.objective}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={`/i/${detail.project.publicLinkToken}`}>Open participant link</Link>
            </Button>
            <form action={refreshSynthesisAction}>
              <input type="hidden" name="projectId" value={detail.project.id} />
              <Button type="submit">Refresh synthesis</Button>
            </form>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardDescription>Configuration v{detail.configVersion.versionNumber}</CardDescription>
              <CardTitle>Coverage-first interview setup</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="eyebrow">Areas of interest</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {detail.configVersion.areasOfInterest.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow">Required questions</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {detail.configVersion.requiredQuestions.map((question) => (
                    <li key={question.id}>{question.prompt}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Project synthesis</CardDescription>
              <CardTitle>{detail.synthesis.warning ?? "No warning"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="eyebrow">Top problems</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {detail.synthesis.topProblems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow">Suggested workshop agenda</p>
                <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {detail.synthesis.suggestedWorkshopAgenda.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardDescription>Emerging themes</CardDescription>
            <CardTitle>Cross-interview synthesis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.synthesis.crossInterviewThemes.map((theme) => (
              <div
                key={theme.id}
                className="rounded-3xl border border-border/70 bg-background/70 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{theme.title}</h2>
                  <Badge variant="neutral">{theme.frequency} sessions</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{theme.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Session review queue</CardDescription>
            <CardTitle>Transcript-backed interviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.sessions.map((session) => {
              const qualityScore = detail.qualityScores[session.id]

              return (
                <div
                  key={session.id}
                  className="rounded-3xl border border-border/70 bg-background/70 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{session.respondentLabel}</h2>
                        <Badge variant={statusVariant(session.status)}>{session.status}</Badge>
                        {session.qualityFlag ? (
                          <Badge variant="warning">Low quality</Badge>
                        ) : null}
                        {session.excludedFromSynthesis ? (
                          <Badge variant="danger">Excluded</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Last activity: {new Date(session.lastActivityAt).toLocaleString()}
                      </p>
                      {qualityScore ? (
                        <p className="text-sm leading-6 text-muted-foreground">
                          Quality score: {Math.round(qualityScore.overall * 100)}%
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/app/projects/${projectId}/sessions/${session.id}`}>
                          Review session
                        </Link>
                      </Button>
                      <form action={toggleSessionExclusionAction}>
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="sessionId" value={session.id} />
                        <input
                          type="hidden"
                          name="excluded"
                          value={session.excludedFromSynthesis ? "false" : "true"}
                        />
                        <Button type="submit" variant="secondary" size="sm">
                          {session.excludedFromSynthesis ? "Include" : "Exclude"}
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
