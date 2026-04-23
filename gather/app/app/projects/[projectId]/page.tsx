import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import { ProjectSynthesisOverrideForm } from "@/components/dashboard/project-synthesis-override-form"
import { ProjectTypeBadge } from "@/components/dashboard/project-type-badge"
import { ProjectEvidenceSurface } from "@/components/dashboard/project-evidence-surface"
import { ProjectVersionForm } from "@/components/dashboard/project-version-form"
import { RefreshSynthesisButton } from "@/components/dashboard/refresh-synthesis-button"
import { SessionsTable } from "@/components/dashboard/sessions-table"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { CopyLink } from "@/components/ui/copy-link"
import { RelativeTime } from "@/components/ui/relative-time"
import { getProjectDetail } from "@/lib/data/repository"
import { getProjectTypePreset } from "@/lib/project-types"
import { formatProjectSynthesisWarning } from "@/lib/project-synthesis-warning"

interface ProjectDetailPageProps {
  params: Promise<{
    projectId: string
  }>
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

  const stats = computeSessionStats(detail.sessions)
  const synthesisOverrideActive = Boolean(
    detail.synthesisOverride?.editedNarrative.trim()
  )
  const projectTypePreset = getProjectTypePreset(detail.project.projectType)
  const respondentContext =
    detail.project.projectType === "feedback"
      ? "respondent feedback"
      : "stakeholder inputs"
  const synthesisWarning = formatProjectSynthesisWarning(detail.synthesis.warning)

  return (
    <div className="stack gap-5">
      <Breadcrumb
        items={[
          { label: "Workspace", href: "/app" },
          { label: "Projects", href: "/app/projects" },
          { label: detail.project.name },
        ]}
      />

      <section className="panel-flush">
        <header className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="stack max-w-3xl gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <ProjectTypeBadge projectType={detail.project.projectType} />
              <span className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                Version {detail.configVersion.versionNumber}
              </span>
              {synthesisOverrideActive ? (
                <Badge variant="warning">Narrative override</Badge>
              ) : null}
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-balance">
              {detail.project.name}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {detail.configVersion.objective}
            </p>
          </div>
          <div className="stack gap-2 lg:items-end">
            <CopyLink
              value={shareUrl}
              label="Copy link"
              className="w-full lg:w-[340px]"
            />
            {projectTypePreset.shareHint ? (
              <p className="max-w-[340px] text-xs leading-5 text-muted-foreground lg:text-right">
                {projectTypePreset.shareHint}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/i/${detail.project.publicLinkToken}`}>Preview</Link>
              </Button>
              <RefreshSynthesisButton projectId={detail.project.id} />
            </div>
          </div>
        </header>

        <div className="divider" />

        <section className="flex flex-wrap gap-2 px-6 py-4">
          <StatChip label="Done" value={stats.completed} />
          <StatChip label="Live" value={stats.live} />
          <StatChip label="Flagged" value={stats.flagged} tone="warning" />
          <StatChip
            label="In synthesis"
            value={stats.includedInSynthesis}
            tone="accent"
          />
        </section>

        <div className="divider" />

        <section className="stack gap-5 px-6 py-5">
          <div className="stack gap-1">
            <h2 className="eyebrow-sm">Synthesis readout</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              This is the consultant-facing synthesis view, grounded in the latest
              effective {respondentContext}.
            </p>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(18rem,0.82fr)_minmax(0,1.18fr)]">
            <section className="stack gap-4 rounded-3xl border border-border/70 bg-background/60 p-5 lg:self-start">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  Overview
                </h3>
                <span className="chip">
                  {detail.synthesis.includedSessionIds.length} session
                  {detail.synthesis.includedSessionIds.length === 1 ? "" : "s"} in
                  synthesis
                </span>
              </div>
              <p className="max-w-[54ch] text-sm leading-6 text-foreground">
                {detail.synthesis.executiveSummary ||
                  "Synthesis will strengthen after the first completed sessions with usable evidence arrive."}
              </p>
              {synthesisWarning ? (
                <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-800 dark:text-amber-200">
                  {synthesisWarning}
                </p>
              ) : null}
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <BulletBlock
                label="Alignment signals"
                items={detail.synthesis.alignmentSignals}
                emptyMessage="No alignment signals surfaced yet."
              />
              <BulletBlock
                label="Misalignment signals"
                items={detail.synthesis.misalignmentSignals}
                emptyMessage="No misalignment signals surfaced yet."
              />
              <BulletBlock
                label="Top pain points"
                items={detail.synthesis.topProblems}
                emptyMessage="No pain points surfaced yet."
              />
              <BulletBlock
                label={projectTypePreset.focusAreasLabel}
                items={detail.synthesis.recommendedFocusAreas}
                ordered
                emptyMessage="Recommended focus areas appear once synthesis runs."
              />
            </div>
          </div>

          <details
            className="group rounded-3xl border border-border/70 bg-background/60 p-5 [&_summary::-webkit-details-marker]:hidden"
            open={synthesisOverrideActive}
          >
            <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-md outline-none">
              <div className="flex items-center gap-2">
                <span className="eyebrow-sm">Consultant narrative override</span>
                {synthesisOverrideActive ? (
                  <Badge variant="accent">Active</Badge>
                ) : null}
              </div>
              <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                edit readout
              </span>
            </summary>
            <div className="pt-4">
              <ProjectSynthesisOverrideForm
                projectId={detail.project.id}
                generatedNarrative={detail.generatedSynthesis.executiveSummary}
                override={detail.synthesisOverride}
              />
            </div>
          </details>
        </section>

        <div className="divider" />

        <ProjectEvidenceSurface
          projectId={detail.project.id}
          contradictions={detail.synthesis.contradictionMap}
          notableQuotes={detail.synthesis.notableQuotesByTheme}
          themes={detail.synthesis.crossInterviewThemes}
        />

        <div className="divider" />

        <section className="stack gap-5 px-6 py-5">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <section className="stack gap-4">
              <h2 className="eyebrow-sm">Collection setup</h2>
              <BulletBlock
                label="Topics"
                items={detail.configVersion.areasOfInterest}
                emptyMessage="No topics configured."
              />
              <BulletBlock
                label="Must-ask questions"
                items={detail.configVersion.requiredQuestions.map((q) => q.prompt)}
                emptyMessage="No required questions configured."
              />
              {detail.configVersion.backgroundContext ? (
                <section className="rounded-3xl border border-border/70 bg-background/60 p-5">
                  <h3 className="text-sm font-semibold text-foreground">
                    Background context
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {detail.configVersion.backgroundContext}
                  </p>
                </section>
              ) : null}
            </section>

            <section className="stack gap-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="eyebrow-sm">Version history</h2>
                <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                  future sessions only
                </span>
              </div>
              <div className="stack gap-3">
                {detail.configHistory.map((version, index) => (
                  <article
                    key={version.id}
                    className="rounded-3xl border border-border/70 bg-background/60 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={index === 0 ? "accent" : "neutral"}>
                        Version {version.versionNumber}
                      </Badge>
                      {index === 0 ? <Badge variant="success">Active</Badge> : null}
                      <span className="text-xs text-muted-foreground">
                        Created <RelativeTime date={version.createdAt} />
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {version.objective}
                    </p>
                  </article>
                ))}
              </div>

              <details className="group rounded-3xl border border-border/70 bg-background/60 p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-md outline-none">
                  <span className="eyebrow-sm">Create next version</span>
                  <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                    update script
                  </span>
                </summary>
                <div className="pt-4">
                  <ProjectVersionForm
                    project={detail.project}
                    configVersion={detail.configVersion}
                  />
                </div>
              </details>
            </section>
          </div>
        </section>

        <div className="divider" />

        <section className="stack gap-3 px-6 py-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="eyebrow-sm">Sessions</h2>
            <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              {detail.sessions.length}{" "}
              {detail.sessions.length === 1 ? "session" : "sessions"}
            </span>
          </div>
          <SessionsTable
            projectId={projectId}
            sessions={detail.sessions}
            qualityScores={detail.qualityScores}
          />
        </section>
      </section>
    </div>
  )
}

function computeSessionStats(
  sessions: { status: string; qualityFlag: boolean; excludedFromSynthesis: boolean }[]
) {
  return sessions.reduce(
    (acc, session) => {
      if (session.status === "complete") {
        acc.completed += 1
        if (!session.excludedFromSynthesis) {
          acc.includedInSynthesis += 1
        }
      }
      if (session.status === "in_progress") {
        acc.live += 1
      }
      if (session.qualityFlag) {
        acc.flagged += 1
      }
      return acc
    },
    { completed: 0, live: 0, flagged: 0, includedInSynthesis: 0 }
  )
}

function StatChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: number
  tone?: "neutral" | "warning" | "accent"
}) {
  const valueColor =
    tone === "warning"
      ? "text-amber-700 dark:text-amber-300"
      : tone === "accent"
        ? "text-primary"
        : "text-foreground"
  return (
    <span className="chip gap-2 px-3 py-1.5">
      <span
        className={`text-base font-semibold tabular-nums leading-none ${valueColor}`}
      >
        {value}
      </span>
      <span className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </span>
    </span>
  )
}

function BulletBlock({
  label,
  items,
  ordered = false,
  emptyMessage,
}: {
  label: string
  items: string[]
  ordered?: boolean
  emptyMessage: string
}) {
  const ListTag = ordered ? "ol" : "ul"
  return (
    <section className="rounded-3xl border border-border/70 bg-background/60 p-5">
      <p className="eyebrow-sm">{label}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ListTag
          className={`mt-3 stack gap-1.5 text-sm leading-6 text-foreground ${ordered ? "list-decimal pl-5 marker:text-muted-foreground" : "list-disc pl-5 marker:text-muted-foreground"}`}
        >
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ListTag>
      )}
    </section>
  )
}
