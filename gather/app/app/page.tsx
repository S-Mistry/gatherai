import Link from "next/link"
import { FolderOpen } from "@phosphor-icons/react/dist/ssr"

import { MetricCard } from "@/components/dashboard/metric-card"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { getWorkspaceSnapshot } from "@/lib/data/repository"

export default async function ConsultantHomePage() {
  const snapshot = await getWorkspaceSnapshot()
  const aggregate = snapshot.projects.reduce(
    (accumulator, project) => ({
      inProgress: accumulator.inProgress + project.sessionCounts.inProgress,
      completed: accumulator.completed + project.sessionCounts.completed,
      abandoned: accumulator.abandoned + project.sessionCounts.abandoned,
      flagged: accumulator.flagged + project.sessionCounts.flagged,
    }),
    { inProgress: 0, completed: 0, abandoned: 0, flagged: 0 }
  )

  const firstProject = snapshot.projects[0] ?? null

  return (
    <div className="space-y-6">
      <section className="panel space-y-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="space-y-3">
            <p className="text-xs tracking-[0.24em] text-muted-foreground uppercase">
              Welcome back.
            </p>
            <div>
              <h1 className="text-4xl font-semibold text-balance">
                {snapshot.workspace.name}
              </h1>
            </div>
          </div>

          <Button asChild size="lg">
            <Link href="/app/projects/new">New project</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Projects"
            value={String(snapshot.projects.length)}
            hint="Active workshop prep."
          />
          <MetricCard
            label="Live now"
            value={String(aggregate.inProgress)}
            hint={`${aggregate.inProgress} interviews in progress.`}
          />
          <MetricCard
            label="Completed"
            value={String(aggregate.completed)}
            hint="Ready for review."
          />
          <MetricCard
            label="Needs review"
            value={String(aggregate.flagged)}
            hint="Short answers or unclear responses."
            accent="Review before trusting synthesis."
          />
        </div>
      </section>

      <section className="grid gap-4">
        {firstProject ? (
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
                    {firstProject.sessionCounts.inProgress} in progress,{" "}
                    {firstProject.sessionCounts.completed} completed,{" "}
                    {firstProject.sessionCounts.abandoned} abandoned.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="eyebrow">Themes emerging</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    {firstProject.activeThemes.map((theme) => (
                      <li key={theme.id}>{theme.title}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <Button asChild variant="outline">
                <Link href={`/app/projects/${firstProject.id}`}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="No projects yet."
            description="Create one to share a link with stakeholders."
            action={
              <Button asChild>
                <Link href="/app/projects/new">New project</Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  )
}
