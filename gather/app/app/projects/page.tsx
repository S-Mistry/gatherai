import Link from "next/link"

import { ConsultantAppBar } from "@/components/dashboard/consultant-app-bar"
import { DeleteArchivedProjectsButton } from "@/components/dashboard/project-archive-actions"
import { ProjectTile } from "@/components/dashboard/project-tile"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { listProjects } from "@/lib/data/repository"
import { getProjectTypePreset } from "@/lib/project-types"

type SearchParams = Record<string, string | string[] | undefined>

type ProjectsPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams
}

type ProjectFilter = "live" | "completed" | "needs-review" | "archived"
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
    label: "Live",
    description: "Projects with sessions currently in progress.",
    emptyTitle: "Nothing live right now.",
    emptyDescription:
      "Projects show up here when respondents are mid-session.",
    predicate: (project) => project.sessionCounts.inProgress > 0,
  },
  completed: {
    label: "Completed",
    description: "Projects with finished sessions ready for review.",
    emptyTitle: "No completed sessions yet.",
    emptyDescription:
      "Projects appear here after at least one session finishes.",
    predicate: (project) => project.sessionCounts.completed > 0,
  },
  "needs-review": {
    label: "Needs review",
    description: "Projects with flagged sessions waiting on you.",
    emptyTitle: "Nothing needs review right now.",
    emptyDescription:
      "Flagged sessions land here when quality checks find issues.",
    predicate: (project) => project.sessionCounts.flagged > 0,
  },
  archived: {
    label: "Archived",
    description:
      "Archived projects are hidden from the workspace, but can be restored.",
    emptyTitle: "Archive is empty.",
    emptyDescription:
      "Projects you archive will land here before permanent deletion.",
    predicate: (project) => Boolean(project.archivedAt),
  },
}

function normalizeFilter(
  value: string | string[] | undefined
): ProjectFilter | null {
  const candidate = Array.isArray(value) ? value[0] : value
  if (
    candidate === "live" ||
    candidate === "completed" ||
    candidate === "needs-review" ||
    candidate === "archived"
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
  const [activeProjects, archivedProjects] = await Promise.all([
    listProjects(),
    listProjects({ view: "archived" }),
  ])
  const allProjects =
    activeFilter === "archived" ? archivedProjects : activeProjects
  const projects =
    activeFilter && activeFilter !== "archived"
      ? activeProjects.filter((project) =>
          filterConfig[activeFilter].predicate(project)
        )
      : allProjects
  const activeFilterConfig = activeFilter ? filterConfig[activeFilter] : null
  const displayCount =
    activeFilter === "archived" ? archivedProjects.length : activeProjects.length

  return (
    <>
      <ConsultantAppBar
        crumb={[
          { label: "Workspace", href: "/app" },
          { label: "Projects" },
        ]}
      />
    <div
      style={{
        padding: "48px 48px 80px",
        maxWidth: 1280,
        margin: "0 auto",
      }}
      className="space-y-10"
    >
      <section>
        <div className="font-hand text-[24px] text-[var(--clay)]">
          your bookshelf —
        </div>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-baseline gap-3.5">
            <h1
              className="font-serif"
              style={{
                fontSize: 44,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              Projects
            </h1>
            <span className="font-mono text-[12px] text-[var(--ink-3)]">
              {displayCount}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <FilterChips
              activeFilter={activeFilter}
              archivedCount={archivedProjects.length}
            />
            {activeFilter === "archived" ? (
              <DeleteArchivedProjectsButton count={archivedProjects.length} />
            ) : (
              <Button asChild variant="clay" size="sm">
                <Link href="/app/projects/new">+ New project</Link>
              </Button>
            )}
          </div>
        </div>
        {activeFilterConfig ? (
          <p className="font-sans mt-3 text-[13px] text-[var(--ink-3)]">
            {activeFilterConfig.description}
          </p>
        ) : null}
      </section>

      {allProjects.length === 0 ? (
        <EmptyState
          title={activeFilterConfig?.emptyTitle ?? "No projects yet."}
          description={
            activeFilterConfig?.emptyDescription ??
            "Create one to share a link with respondents."
          }
          action={
            activeFilter === "archived" ? (
              <Button asChild variant="ghost">
                <Link href="/app/projects">Back to active projects</Link>
              </Button>
            ) : (
              <Button asChild variant="clay">
                <Link href="/app/projects/new">New project</Link>
              </Button>
            )
          }
        />
      ) : projects.length === 0 ? (
        <EmptyState
          title={activeFilterConfig?.emptyTitle ?? "No matching projects."}
          description={
            activeFilterConfig?.emptyDescription ??
            "Adjust the current filter to see more projects."
          }
          action={
            <Button asChild variant="ghost">
              <Link href="/app/projects">Show all projects</Link>
            </Button>
          }
        />
      ) : (
        <section className="workspace-project-grid gap-5">
          {projects.map((project) => (
            <ProjectTile
              key={project.id}
              project={{
                id: project.id,
                name: project.name,
                projectType: project.projectType,
                status: project.status,
                sessionCounts: project.sessionCounts,
                includedSessions: project.includedSessions,
                updatedAt: project.updatedAt,
                archivedAt: project.archivedAt,
                testimonialCounts: project.testimonialCounts,
                motionState: project.motionState,
                tagline: getProjectTypePreset(project.projectType).audiencePlural,
              }}
            />
          ))}
        </section>
      )}
    </div>
    </>
  )
}

function FilterChips({
  activeFilter,
  archivedCount,
}: {
  activeFilter: ProjectFilter | null
  archivedCount: number
}) {
  const filters: Array<{ key: ProjectFilter | null; label: string }> = [
    { key: null, label: "All" },
    { key: "live", label: "Live" },
    { key: "completed", label: "Completed" },
    { key: "needs-review", label: "Needs review" },
    { key: "archived", label: `Archive (${archivedCount})` },
  ]
  return (
    <div
      role="tablist"
      aria-label="Filter projects"
      className="flex flex-wrap items-center gap-2"
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
            className={cn("chip", isActive && "clay")}
          >
            {filter.label}
          </Link>
        )
      })}
    </div>
  )
}
