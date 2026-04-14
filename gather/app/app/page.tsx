import Link from "next/link"

import { MetricCard } from "@/components/dashboard/metric-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getWorkspaceSnapshot } from "@/lib/data/mock"

export default function ConsultantHomePage() {
  const snapshot = getWorkspaceSnapshot()
  const aggregate = snapshot.projects.reduce(
    (accumulator, project) => ({
      inProgress: accumulator.inProgress + project.sessionCounts.inProgress,
      completed: accumulator.completed + project.sessionCounts.completed,
      abandoned: accumulator.abandoned + project.sessionCounts.abandoned,
      flagged: accumulator.flagged + project.sessionCounts.flagged,
    }),
    { inProgress: 0, completed: 0, abandoned: 0, flagged: 0 }
  )

  const firstProject = snapshot.projects[0]

  return (
    <div className="space-y-6">
      <section className="panel space-y-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="space-y-3">
            <Badge variant="accent">Consultant overview</Badge>
            <div>
              <h1 className="text-4xl font-semibold text-balance">
                {snapshot.workspace.name}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Monitor project progress, surface low-quality interviews early, and keep synthesis
                tied to transcript evidence.
              </p>
            </div>
          </div>

          <Button asChild size="lg">
            <Link href="/app/projects/new">Create discovery project</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Projects"
            value={String(snapshot.projects.length)}
            hint="Single-consultant workspace, one dashboard for all active workshop prep."
          />
          <MetricCard
            label="In progress"
            value={String(aggregate.inProgress)}
            hint="Participants currently in active or resumable interviews."
          />
          <MetricCard
            label="Completed"
            value={String(aggregate.completed)}
            hint="Completed sessions with transcript-backed outputs queued or available."
          />
          <MetricCard
            label="Flagged"
            value={String(aggregate.flagged)}
            hint="Low-quality interviews requiring consultant review or exclusion."
            accent="Review these before trusting synthesis."
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardDescription>Active project</CardDescription>
            <CardTitle>{firstProject.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="eyebrow">Recent activity</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {firstProject.sessionCounts.inProgress} interview in progress,{" "}
                  {firstProject.sessionCounts.completed} completed,{" "}
                  {firstProject.sessionCounts.abandoned} abandoned.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="eyebrow">Emerging themes</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {firstProject.activeThemes.map((theme) => (
                    <li key={theme.id}>{theme.title}</li>
                  ))}
                </ul>
              </div>
            </div>

            <Button asChild variant="outline">
              <Link href={`/app/projects/${firstProject.id}`}>Open project workspace</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Dashboard design notes</CardDescription>
            <CardTitle>Signal over decoration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Invited counts are intentionally absent in MVP because the product does not manage invitations.</p>
            <p>Focus the consultant on completion status, emerging themes, and quality flags.</p>
            <p>Every synthesized claim should remain traceable back to transcript segments.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
