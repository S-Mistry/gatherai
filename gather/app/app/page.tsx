import Link from "next/link"

import { ProjectTile } from "@/components/dashboard/project-tile"
import { getProjectTypePreset } from "@/lib/project-types"
import { getWorkspaceSnapshot } from "@/lib/data/repository"

function workspaceFirstName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return "there"
  const handle = trimmed.replace(/['"]/g, "")
  return (handle.split(/\s+/)[0] ?? handle).toLowerCase()
}

function dayLabel() {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toLowerCase()
    .replace(",", " ·")
}

function ordinal(n: number): string {
  const abs = Math.abs(n)
  const lastTwo = abs % 100
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`
  switch (abs % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

function describeFreshness(snapshot: Awaited<ReturnType<typeof getWorkspaceSnapshot>>) {
  const fresh = snapshot.projects
    .filter((p) => p.status === "synthesizing" || p.sessionCounts.completed > 0)
    .sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))[0]
  if (!fresh) return "No flagged sessions — synthesis is fresh."
  const completed = fresh.sessionCounts.completed
  if (completed === 0) {
    return "Synthesis is waiting on its first completed session."
  }
  return (
    <>
      <strong style={{ color: "var(--ink)" }}>{fresh.name}</strong> finished its{" "}
      {ordinal(completed)} interview overnight — synthesis is fresh.
    </>
  )
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
  const waitingCount = live.length + snapshot.recentNeedsReviewSessions.length

  return (
    <>
      {/* Hero */}
      <section style={{ padding: "48px 48px 28px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="font-hand" style={{ fontSize: 28, color: "var(--clay)", marginBottom: 4 }}>
          good morning, {firstName} —
        </div>
        <h1
          className="font-serif"
          style={{
            fontSize: 64,
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
        <div style={{ display: "flex", gap: 28, alignItems: "baseline", flexWrap: "wrap" }}>
          <span className="font-sans" style={{ fontSize: 14, color: "var(--ink-2)" }}>
            {describeFreshness(snapshot)}
          </span>
          <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            {dayLabel()}
          </span>
        </div>
      </section>

      {/* In motion */}
      {live.length > 0 ? (
        <section style={{ padding: "0 48px 32px", maxWidth: 1280, margin: "0 auto" }}>
          <div className="section-head">
            <h2 className="font-serif" style={{ fontSize: 26, fontWeight: 400 }}>
              In motion
            </h2>
            <span className="font-hand" style={{ fontSize: 18, color: "var(--ink-3)" }}>
              — need a look
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 22 }}>
            {live.map((p) => (
              <ProjectTile key={p.id} project={p} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Quiet for now */}
      <section style={{ padding: "20px 48px 80px", maxWidth: 1280, margin: "0 auto" }}>
        <div className="section-head">
          <h2
            className="font-serif"
            style={{ fontSize: 22, fontWeight: 400, color: "var(--ink-2)" }}
          >
            {tiles.length === 0
              ? "Start your first project"
              : quiet.length === 0
                ? "Everything in motion"
                : "Quiet for now"}
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {quiet.map((p) => (
            <ProjectTile key={p.id} project={p} />
          ))}
          <Link
            href="/app/projects/new"
            className="grid place-items-center text-center"
            style={{
              border: "1.5px dashed var(--line)",
              borderRadius: 8,
              padding: "24px 26px",
              minHeight: 180,
              color: "var(--ink-3)",
            }}
          >
            <div>
              <div
                className="font-hand"
                style={{ fontSize: 32, color: "var(--clay)" }}
              >
                + start a new one
              </div>
              <div
                className="font-sans"
                style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8 }}
              >
                stakeholder interviews · feedback pulse
              </div>
            </div>
          </Link>
        </div>
      </section>
    </>
  )
}
