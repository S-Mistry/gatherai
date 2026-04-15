import Link from "next/link"
import { FolderOpen } from "@phosphor-icons/react/dist/ssr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { listProjects } from "@/lib/data/repository"

type SearchParams = Record<string, string | string[] | undefined>

type ProjectsPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams
}

type ProjectFilter = "live" | "completed" | "needs-review"
type ProjectSummary = Awaited<ReturnType<typeof listProjects>>[number]

const filterConfig: Record<
  ProjectFilter,
  {
    label: string
    description: string
    emptyTitle: string
    emptyDescription: string
    predicate: (project: ProjectSummary) => boolean
  }
> = {
  live: {
    label: "Live now",
    description: "Showing projects with interviews currently in progress.",
    emptyTitle: "No live interviews right now.",
    emptyDescription:
      "Projects will appear here when stakeholders are in an active session.",
    predicate: (project) => project.sessionCounts.inProgress > 0,
  },
  completed: {
    label: "Completed",
    description: "Showing projects with completed interviews ready for review.",
    emptyTitle: "No completed interviews yet.",
    emptyDescription:
      "Projects will appear here after at least one stakeholder finishes an interview.",
    predicate: (project) => project.sessionCounts.completed > 0,
  },
  "needs-review": {
    label: "Needs review",
    description:
      "Showing projects with flagged interviews that need consultant review.",
    emptyTitle: "Nothing needs review right now.",
    emptyDescription:
      "Projects with flagged interviews will appear here when quality checks find issues.",
    predicate: (project) => project.sessionCounts.flagged > 0,
  },
}

function normalizeFilter(
  value: string | string[] | undefined
): ProjectFilter | null {
  const candidate = Array.isArray(value) ? value[0] : value

  if (
    candidate === "live" ||
    candidate === "completed" ||
    candidate === "needs-review"
  ) {
    return candidate
  }

  return null
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const activeFilter = normalizeFilter(resolvedSearchParams.filter)
  const allProjects = await listProjects()
  const projects = activeFilter
    ? allProjects.filter((project) =>
        filterConfig[activeFilter].predicate(project)
      )
    : allProjects
  const activeFilterConfig = activeFilter ? filterConfig[activeFilter] : null

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div>
            <h1 className="text-4xl font-semibold">Projects</h1>
          </div>
        </div>
        <Button asChild size="lg">
          <Link href="/app/projects/new">New project</Link>
        </Button>
      </section>

      {allProjects.length === 0 ? (
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
      ) : (
        <>
          {activeFilterConfig ? (
            <section className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Badge variant="accent">{activeFilterConfig.label}</Badge>
                <p className="text-sm leading-6 text-muted-foreground">
                  {activeFilterConfig.description}
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/app/projects">Show all projects</Link>
              </Button>
            </section>
          ) : null}

          {projects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={activeFilterConfig?.emptyTitle ?? "No matching projects."}
              description={
                activeFilterConfig?.emptyDescription ??
                "Adjust the current filter to see more projects."
              }
              action={
                <Button asChild variant="outline">
                  <Link href="/app/projects">Show all projects</Link>
                </Button>
              }
            />
          ) : (
            <section className="grid gap-4">
              {projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription>
                        {project.clientName} • {project.sessionCounts.completed}{" "}
                        completed • {project.sessionCounts.inProgress} in
                        progress
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        project.sessionCounts.flagged > 0
                          ? "warning"
                          : "success"
                      }
                    >
                      {project.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 sm:gap-6">
                      <p>Abandoned: {project.sessionCounts.abandoned}</p>
                      <p>Flagged: {project.sessionCounts.flagged}</p>
                      <p>Included in synthesis: {project.includedSessions}</p>
                    </div>
                    <Button asChild variant="outline">
                      <Link href={`/app/projects/${project.id}`}>Open</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
