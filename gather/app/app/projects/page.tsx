import Link from "next/link"
import { ArrowRight, FolderOpen } from "@phosphor-icons/react/dist/ssr"

import { ProjectTypeBadge } from "@/components/dashboard/project-type-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
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
    description: "Showing projects with sessions currently in progress.",
    emptyTitle: "No live sessions right now.",
    emptyDescription:
      "Projects will appear here when people are in an active session.",
    predicate: (project) => project.sessionCounts.inProgress > 0,
  },
  completed: {
    label: "Completed",
    description: "Showing projects with completed sessions ready for review.",
    emptyTitle: "No completed sessions yet.",
    emptyDescription:
      "Projects will appear here after at least one session finishes.",
    predicate: (project) => project.sessionCounts.completed > 0,
  },
  "needs-review": {
    label: "Needs review",
    description:
      "Showing projects with flagged sessions that need consultant review.",
    emptyTitle: "Nothing needs review right now.",
    emptyDescription:
      "Projects with flagged sessions will appear here when quality checks find issues.",
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
    <div className="stack gap-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <span className="text-xs tabular-nums text-muted-foreground">
            {allProjects.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterChips activeFilter={activeFilter} />
          <Button asChild size="sm">
            <Link href="/app/projects/new">New project</Link>
          </Button>
        </div>
      </section>

      {allProjects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet."
          description="Create one to share a link with respondents."
          action={
            <Button asChild>
              <Link href="/app/projects/new">New project</Link>
            </Button>
          }
        />
      ) : projects.length === 0 ? (
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
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-background/60">
          <ul>
            {projects.map((project, idx) => (
              <li
                key={project.id}
                className={cn(
                  "grid grid-cols-1 gap-2 px-4 py-3 transition-colors hover:bg-primary/5",
                  "md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-center md:gap-4",
                  idx > 0 && "border-t border-border/60"
                )}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/app/projects/${project.id}`}
                      className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {project.name}
                    </Link>
                    <ProjectTypeBadge projectType={project.projectType} />
                  </div>
                </div>

                <div>
                  <Badge
                    variant={
                      project.sessionCounts.flagged > 0
                        ? "warning"
                        : project.status === "ready"
                          ? "success"
                          : "neutral"
                    }
                  >
                    {project.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
                  <span>
                    <span className="font-semibold text-foreground">
                      {project.sessionCounts.completed}
                    </span>{" "}
                    done
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {project.sessionCounts.inProgress}
                    </span>{" "}
                    live
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {project.sessionCounts.flagged}
                    </span>{" "}
                    flagged
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {project.includedSessions}
                    </span>{" "}
                    in synthesis
                  </span>
                </div>

                <div className="flex justify-end">
                  <Link
                    href={`/app/projects/${project.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/8 hover:text-primary"
                  >
                    Open
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function FilterChips({ activeFilter }: { activeFilter: ProjectFilter | null }) {
  const filters: Array<{ key: ProjectFilter | null; label: string }> = [
    { key: null, label: "All" },
    { key: "live", label: "Live" },
    { key: "completed", label: "Completed" },
    { key: "needs-review", label: "Needs review" },
  ]
  return (
    <div
      role="tablist"
      aria-label="Filter projects"
      className="flex flex-wrap items-center gap-1"
    >
      {filters.map((filter) => {
        const isActive = filter.key === activeFilter
        const href = filter.key
          ? `/app/projects?filter=${filter.key}`
          : "/app/projects"
        return (
          <Link
            key={filter.label}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "focus-ring chip transition-colors",
              isActive
                ? "border-primary/40 bg-primary/12 text-primary"
                : "text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {filter.label}
          </Link>
        )
      })}
    </div>
  )
}
