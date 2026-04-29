import Link from "next/link"

import type {
  ProjectMotionState,
  TestimonialProjectMetrics,
} from "@/lib/data/derived"
import type { ProjectType } from "@/lib/domain/types"
import { getProjectTypePreset } from "@/lib/project-types"
import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import { ProjectTileArchiveActions } from "@/components/dashboard/project-archive-actions"
import { RelativeTime } from "@/components/ui/relative-time"

export interface ProjectTileData {
  id: string
  name: string
  projectType: ProjectType
  status: string
  sessionCounts: {
    inProgress: number
    completed: number
    abandoned: number
    flagged: number
  }
  includedSessions?: number
  updatedAt?: string
  tagline?: string
  archivedAt?: string
  testimonialCounts?: TestimonialProjectMetrics
  motionState?: ProjectMotionState
}

function statusChip(
  projectType: ProjectType,
  status: string,
  sessionCounts: ProjectTileData["sessionCounts"],
  testimonialCounts?: TestimonialProjectMetrics
) {
  if (projectType === "testimonial") {
    if ((testimonialCounts?.pending ?? 0) > 0) {
      return {
        cls: "gold",
        label:
          testimonialCounts?.pending === 1
            ? "pending review"
            : `${testimonialCounts?.pending} pending`,
        dot: true,
      }
    }
    if ((testimonialCounts?.approved ?? 0) > 0) {
      return {
        cls: "sage",
        label: `${testimonialCounts?.approved} approved`,
        dot: false,
      }
    }
    if ((testimonialCounts?.total ?? 0) > 0) {
      return { cls: "neutral", label: "reviewed", dot: false }
    }
    return { cls: "gold", label: "collecting", dot: false }
  }

  if (sessionCounts.inProgress > 0) {
    return { cls: "clay", label: "live", dot: true }
  }
  if (status === "synthesizing") {
    return { cls: "clay", label: "synthesizing", dot: true }
  }
  if (status === "active" && sessionCounts.completed > 0) {
    return { cls: "sage", label: "collecting", dot: true }
  }
  if (status === "active") {
    return { cls: "gold", label: "scheduling", dot: false }
  }
  if (status === "complete") {
    return { cls: "neutral", label: "complete", dot: false }
  }
  return { cls: "neutral", label: status, dot: false }
}

function TypeFlavor({ projectType }: { projectType: ProjectType }) {
  if (projectType === "feedback") {
    return (
      <span className="font-hand" style={{ fontSize: 18, color: "var(--sage)" }}>
        ✶ feedback pulse
      </span>
    )
  }
  if (projectType === "testimonial") {
    return (
      <span className="font-hand" style={{ fontSize: 18, color: "var(--ink-2)" }}>
        ☉ testimonial collection
      </span>
    )
  }
  return (
    <span className="font-hand" style={{ fontSize: 18, color: "var(--clay)" }}>
      ☞ stakeholder interviews
    </span>
  )
}

export function ProjectTile({ project }: { project: ProjectTileData }) {
  const live =
    project.motionState?.isInMotion ??
    (project.sessionCounts.inProgress > 0 || project.status === "synthesizing")
  const archived = Boolean(project.archivedAt)
  const status = archived
    ? { cls: "neutral", label: "archived", dot: false }
    : statusChip(
        project.projectType,
        project.status,
        project.sessionCounts,
        project.testimonialCounts
      )
  const preset = getProjectTypePreset(project.projectType)
  const total =
    project.sessionCounts.completed +
    project.sessionCounts.inProgress +
    project.sessionCounts.abandoned
  const done = project.sessionCounts.completed
  const expected = total > 0 ? total : Math.max(done, 1)
  const pct = Math.min(100, Math.round((done / expected) * 100))
  const testimonialCounts = project.testimonialCounts
  const testimonialTotal = testimonialCounts?.total ?? 0
  const testimonialPending = testimonialCounts?.pending ?? 0
  const testimonialApproved = testimonialCounts?.approved ?? 0
  const testimonialDots = testimonialCounts
    ? [
        ...Array.from({ length: testimonialCounts.approved }, () => "approved"),
        ...Array.from({ length: testimonialCounts.pending }, () => "pending"),
        ...Array.from({ length: testimonialCounts.rejected }, () => "rejected"),
      ]
    : []
  const activityAt = project.motionState?.latestActivityAt ?? project.updatedAt

  return (
    <article
      className={cn(
        "project-tile has-actions",
        live && !archived && "live",
        archived && "archived"
      )}
    >
      <Link href={`/app/projects/${project.id}`} className="project-tile-link">
        <TypeFlavor projectType={project.projectType} />
        <h3
          className="font-serif"
          style={{
            fontSize: 26,
            lineHeight: 1.15,
            margin: "6px 0 4px",
            fontWeight: 400,
            letterSpacing: "-0.005em",
          }}
        >
          {project.name}
        </h3>
        <div
          className="font-sans"
          style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 14 }}
        >
          {project.tagline ?? preset.audiencePlural}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "var(--ink-2)" }}
          >
            {project.projectType === "testimonial" ? (
              <>
                {testimonialPending > 0 ? testimonialPending : testimonialApproved}
                <span style={{ color: "var(--ink-4)" }}>
                  {testimonialTotal > 0
                    ? `/${testimonialTotal} ${testimonialPending > 0 ? "pending" : "approved"}`
                    : " reviews"}
                </span>
              </>
            ) : (
              <>
                {done}
                <span style={{ color: "var(--ink-4)" }}>
                  /{Math.max(total, done)}
                </span>
              </>
            )}
          </span>
          {project.projectType === "discovery" ||
          project.projectType === "feedback" ? (
            <div
              style={{
                flex: 1,
                height: 6,
                background: "var(--line)",
                borderRadius: 99,
                overflow: "hidden",
                maxWidth: 140,
              }}
            >
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${pct}%`,
                  background:
                    project.projectType === "feedback"
                      ? "var(--sage)"
                      : "var(--clay)",
                }}
              />
            </div>
          ) : (
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({
                length: Math.max(testimonialTotal, 1),
              }).map((_, i) => {
                const dotStatus = testimonialDots[i]
                const background =
                  dotStatus === "approved"
                    ? "var(--sage)"
                    : dotStatus === "pending"
                      ? "var(--gold)"
                      : dotStatus === "rejected"
                        ? "var(--rose)"
                        : "var(--line)"

                return (
                  <span
                    key={i}
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background,
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
          }}
        >
          <Badge
            variant={status.cls as "clay" | "sage" | "gold" | "neutral"}
            dot={status.dot}
          >
            {status.label}
          </Badge>
          {activityAt ? (
            <span className="font-mono text-[10.5px] text-[var(--ink-3)]">
              <RelativeTime date={activityAt} />
            </span>
          ) : null}
        </div>
      </Link>
      <ProjectTileArchiveActions
        projectId={project.id}
        projectName={project.name}
        mode={archived ? "archived" : "active"}
        liveSessionCount={project.sessionCounts.inProgress}
      />
    </article>
  )
}
