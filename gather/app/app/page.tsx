import Link from "next/link"
import { ArrowRight, FlagPennant, FolderOpen } from "@phosphor-icons/react/dist/ssr"

import { ContinueReviewingRail } from "@/components/dashboard/continue-reviewing-rail"
import { MetricCard } from "@/components/dashboard/metric-card"
import { Button } from "@/components/ui/button"
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
  const flaggedCount = snapshot.recentNeedsReviewSessions.length

  return (
    <div className="stack gap-5">
      <section className="panel-flush">
        <header className="flex flex-col justify-between gap-3 px-6 py-5 lg:flex-row lg:items-end">
          <div className="stack gap-1">
            <p className="eyebrow-sm">Welcome back</p>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              {snapshot.workspace.name}
            </h1>
          </div>
          <Button asChild size="sm">
            <Link href="/app/projects/new">New project</Link>
          </Button>
        </header>

        <div className="divider" />

        <section className="grid gap-3 px-6 py-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Projects"
            value={String(snapshot.projects.length)}
            hint="Active workshop prep."
            href="/app/projects"
            ariaLabel={`Projects: ${snapshot.projects.length}. Open the projects list.`}
          />
          <MetricCard
            label="Live now"
            value={String(aggregate.inProgress)}
            hint={`${aggregate.inProgress} interviews in progress.`}
            href="/app/projects?filter=live"
            ariaLabel={`Live now: ${aggregate.inProgress}. Open projects with interviews in progress.`}
          />
          <MetricCard
            label="Completed"
            value={String(aggregate.completed)}
            hint="Ready for review."
            href="/app/projects?filter=completed"
            ariaLabel={`Completed: ${aggregate.completed}. Open projects with completed interviews.`}
          />
          <MetricCard
            label="Needs review"
            value={String(aggregate.flagged)}
            hint="Short answers or unclear responses."
            accent="Review before trusting synthesis."
            href="/app/projects?filter=needs-review"
            ariaLabel={`Needs review: ${aggregate.flagged}. Open projects with flagged interviews.`}
          />
        </section>

        <div className="divider" />

        {firstProject ? (
          <section className="stack gap-3 px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="stack gap-1">
                <p className="eyebrow-sm">Active project</p>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {firstProject.name}
                </h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link
                  href={`/app/projects/${firstProject.id}`}
                  className="inline-flex items-center gap-1"
                >
                  Open
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="chip">
                <span className="font-semibold tabular-nums text-foreground">
                  {firstProject.sessionCounts.completed}
                </span>
                done
              </span>
              <span className="chip">
                <span className="font-semibold tabular-nums text-foreground">
                  {firstProject.sessionCounts.inProgress}
                </span>
                live
              </span>
              <span className="chip">
                <span className="font-semibold tabular-nums text-foreground">
                  {firstProject.sessionCounts.abandoned}
                </span>
                abandoned
              </span>
            </div>

            {firstProject.activeThemes.length > 0 ? (
              <div className="stack gap-2">
                <p className="eyebrow-sm">Themes emerging</p>
                <ul className="stack gap-1.5 list-disc pl-5 text-sm leading-6 text-muted-foreground marker:text-muted-foreground">
                  {firstProject.activeThemes.map((theme) => (
                    <li key={theme.id}>{theme.title}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="px-6 py-5">
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
          </section>
        )}

        <div className="divider" />

        <section className="stack gap-3 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow-sm">Continue reviewing</p>
            {flaggedCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                <FlagPennant className="size-3" />
                {flaggedCount} flagged
              </span>
            ) : null}
          </div>
          <ContinueReviewingRail sessions={snapshot.recentNeedsReviewSessions} />
        </section>
      </section>
    </div>
  )
}
