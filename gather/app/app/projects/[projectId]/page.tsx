import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import { RefreshSynthesisButton } from "@/components/dashboard/refresh-synthesis-button"
import { SessionExclusionToggle } from "@/components/dashboard/session-exclusion-toggle"
import { ThemeEvidenceDrawer } from "@/components/dashboard/theme-evidence-drawer"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CopyLink } from "@/components/ui/copy-link"
import { RelativeTime } from "@/components/ui/relative-time"
import { getProjectDetail } from "@/lib/data/repository"

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
  const detail = await getProjectDetail(projectId)

  if (!detail) {
    notFound()
  }

  const headerList = await headers()
  const host = headerList.get("host") ?? ""
  const protocol = headerList.get("x-forwarded-proto") ?? "https"
  const shareUrl = host
    ? `${protocol}://${host}/i/${detail.project.publicLinkToken}`
    : `/i/${detail.project.publicLinkToken}`

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Workspace", href: "/app" },
          { label: "Projects", href: "/app/projects" },
          { label: detail.project.name },
        ]}
      />
      <section className="panel space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge variant="accent">{detail.project.clientName}</Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-balance">
                {detail.project.name}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                {detail.configVersion.objective}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <CopyLink value={shareUrl} label="Copy link" className="w-full lg:w-[360px]" />
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/i/${detail.project.publicLinkToken}`}>Preview</Link>
              </Button>
              <RefreshSynthesisButton projectId={detail.project.id} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardDescription>Version {detail.configVersion.versionNumber}</CardDescription>
              <CardTitle>Interview setup</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="eyebrow">Topics</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {detail.configVersion.areasOfInterest.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow">Must-ask questions</p>
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
              <CardTitle>What we&apos;re hearing</CardTitle>
              {detail.synthesis.warning ? (
                <CardDescription>{detail.synthesis.warning}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="eyebrow">Top pain points</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {detail.synthesis.topProblems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow">Suggested agenda</p>
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
            <CardTitle>Themes across interviews</CardTitle>
            <CardDescription>Click a theme to see the quotes it came from.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeEvidenceDrawer themes={detail.synthesis.crossInterviewThemes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
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
                          <Badge variant="warning">Needs review</Badge>
                        ) : null}
                        {session.excludedFromSynthesis ? (
                          <Badge variant="danger">Excluded</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Last active <RelativeTime date={session.lastActivityAt} />
                      </p>
                      {qualityScore ? (
                        <p className="text-sm leading-6 text-muted-foreground">
                          Quality {Math.round(qualityScore.overall * 100)}%
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/app/projects/${projectId}/sessions/${session.id}`}>
                          Review
                        </Link>
                      </Button>
                      <SessionExclusionToggle
                        projectId={projectId}
                        sessionId={session.id}
                        excluded={session.excludedFromSynthesis}
                        respondentLabel={session.respondentLabel}
                      />
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
