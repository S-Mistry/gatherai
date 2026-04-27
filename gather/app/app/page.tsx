import Link from "next/link"

import { ProjectTile } from "@/components/dashboard/project-tile"
import { Button } from "@/components/ui/button"
import { getProjectTypePreset } from "@/lib/project-types"
import { getWorkspaceSnapshot } from "@/lib/data/repository"

function workspaceFirstName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return "there"
  const handle = trimmed.replace(/['"]/g, "")
  return handle.split(/\s+/)[0] ?? handle
}

function dayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export default async function ConsultantHomePage() {
  const snapshot = await getWorkspaceSnapshot()
  const firstName = workspaceFirstName(snapshot.workspace.name)

  const tiles = snapshot.projects.map((project) => ({
    id: project.id,
    name: project.name,
    projectType: project.projectType,
    status: project.status,
    sessionCounts: project.sessionCounts,
    includedSessions: project.includedSessions,
    updatedAt: project.updatedAt,
    tagline: getProjectTypePreset(project.projectType).audiencePlural,
  }))

  const live = tiles.filter(
    (p) => p.sessionCounts.inProgress > 0 || p.status === "synthesizing"
  )
  const quiet = tiles.filter(
    (p) => !(p.sessionCounts.inProgress > 0 || p.status === "synthesizing")
  )

  const waitingCount =
    snapshot.recentNeedsReviewSessions.length + Math.max(0, live.length)

  return (
    <div className="space-y-14">
      <section>
        <div className="font-hand text-[28px] text-[var(--clay)]">
          good morning, {firstName} —
        </div>
        <h1
          className="font-serif"
          style={{
            fontSize: 60,
            fontWeight: 400,
            lineHeight: 1.02,
            margin: "0 0 18px",
            letterSpacing: "-0.015em",
          }}
        >
          {tiles.length === 0 ? (
            <>No projects yet.</>
          ) : waitingCount > 0 ? (
            <>
              {tiles.length} project{tiles.length === 1 ? "" : "s"},{" "}
              <span style={{ fontStyle: "italic", color: "var(--clay)" }}>
                {waitingCount}
              </span>{" "}
              waiting on you.
            </>
          ) : (
            <>{tiles.length} projects, all quiet.</>
          )}
        </h1>
        <div className="flex flex-wrap items-baseline gap-7">
          <span className="font-sans" style={{ fontSize: 14, color: "var(--ink-2)" }}>
            {snapshot.recentNeedsReviewSessions.length > 0
              ? `${snapshot.recentNeedsReviewSessions.length} session${snapshot.recentNeedsReviewSessions.length === 1 ? "" : "s"} flagged for review.`
              : "No flagged sessions — synthesis is fresh."}
          </span>
          <span className="font-mono text-[11px] text-[var(--ink-3)]">
            {dayLabel()}
          </span>
        </div>
      </section>

      {live.length > 0 ? (
        <section>
          <div className="mb-5 flex items-baseline gap-3.5">
            <h2
              className="font-serif"
              style={{ fontSize: 26, fontWeight: 400, margin: 0 }}
            >
              In motion
            </h2>
            <span className="font-hand text-[18px] text-[var(--ink-3)]">
              — need a look
            </span>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {live.map((p) => (
              <ProjectTile key={p.id} project={p} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-5 flex items-baseline gap-3.5">
          <h2
            className="font-serif"
            style={{
              fontSize: 22,
              fontWeight: 400,
              margin: 0,
              color: "var(--ink-2)",
            }}
          >
            {tiles.length === 0
              ? "Start your first project"
              : quiet.length === 0
                ? "Everything in motion"
                : "Quiet for now"}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quiet.map((p) => (
            <ProjectTile key={p.id} project={p} />
          ))}
          <Link
            href="/app/projects/new"
            className="grid place-items-center text-center text-[var(--ink-3)]"
            style={{
              border: "1.5px dashed var(--line)",
              borderRadius: 8,
              padding: "26px 24px",
              minHeight: 180,
            }}
          >
            <div>
              <div className="font-hand text-[32px] text-[var(--clay)]">
                + start a new one
              </div>
              <div
                className="font-sans"
                style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8 }}
              >
                feedback pulse · testimonial collection
              </div>
            </div>
          </Link>
        </div>
      </section>

      {tiles.length === 0 ? (
        <section className="flex justify-center">
          <Button asChild size="lg" variant="clay">
            <Link href="/app/projects/new">+ Create your first project</Link>
          </Button>
        </section>
      ) : null}
    </div>
  )
}
